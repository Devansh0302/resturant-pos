'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Printer, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  order_id: string;
  table_id: string;
  table_number: string;
  kot_requested: boolean;
  bill_requested: boolean;
  guest_count: number;
}

let audioCtx: AudioContext | null = null;

export function NotificationListener() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const prevNotifIds = useRef<Set<string>>(new Set());

  // Only run for Admin and Cashier
  const isPrivileged = (session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'CASHIER';

  useEffect(() => {
    if (!isPrivileged) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        const data: Notification[] = await res.json();
        
        if (Array.isArray(data)) {
          setNotifications(data);

          // Check for new notifications to play sound
          const currentIds = new Set(data.map(n => n.order_id + (n.kot_requested ? 'K' : '') + (n.bill_requested ? 'B' : '')));
          let hasNew = false;
          
          for (const id of currentIds) {
            if (!prevNotifIds.current.has(id)) {
              hasNew = true;
              break;
            }
          }

          if (hasNew) {
            playSound();
          }
          
          prevNotifIds.current = currentIds;
        }
      } catch (error) {
        console.error('Failed to fetch notifications');
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    
    // Add interaction listener to unlock audio context
    const handleInteraction = async () => {
      if (audioCtx && audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch (e) {}
      }
    };
    window.addEventListener('click', handleInteraction);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleInteraction);
    };
  }, [isPrivileged]);

  const playSound = async () => {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
      
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };

  const handlePrintKot = async (orderId: string) => {
    try {
      await fetch(`/api/orders/${orderId}/kot`, { method: 'POST' });
      toast.success('KOT printed successfully');
      // Optimistically remove from view
      setDismissedIds(prev => new Set(prev).add(orderId));
    } catch (error) {
      toast.error('Failed to print KOT');
    }
  };

  const handleGenerateBill = async (orderId: string) => {
    try {
      await fetch(`/api/orders/${orderId}/bill`, { method: 'POST' });
      toast.success('Bill generated successfully');
      setDismissedIds(prev => new Set(prev).add(orderId));
    } catch (error) {
      toast.error('Failed to generate Bill');
    }
  };

  const handleDismiss = (orderId: string) => {
    setDismissedIds(prev => new Set(prev).add(orderId));
  };

  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.order_id));

  if (!isPrivileged || visibleNotifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      <AnimatePresence>
        {visibleNotifications.map((notif) => (
          <motion.div
            key={notif.order_id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="bg-white rounded-xl shadow-xl overflow-hidden relative"
            style={{ border: '1px solid #E5E7EB', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
          >
            <button 
              onClick={() => handleDismiss(notif.order_id)}
              className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="p-4 flex gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ backgroundColor: '#FEF2F2' }}>
                <Bell className="w-5 h-5" style={{ color: '#EF4444' }} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  Table {notif.table_number}
                </h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  Requested {notif.kot_requested && notif.bill_requested ? 'KOT & Bill' : notif.kot_requested ? 'KOT' : 'Bill'}
                </p>
                
                <div className="flex gap-2 mt-3">
                  {notif.kot_requested && (
                    <button
                      onClick={() => handlePrintKot(notif.order_id)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex justify-center items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print KOT
                    </button>
                  )}
                  {notif.bill_requested && (
                    <button
                      onClick={() => handleGenerateBill(notif.order_id)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex justify-center items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" /> Generate Bill
                    </button>
                  )}
                </div>
              </div>
            </div>
            {/* Top accent line */}
            <div className="h-1 w-full bg-red-500 absolute top-0 left-0" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
