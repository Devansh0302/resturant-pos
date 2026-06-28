'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Clock, CheckCircle, ChefHat, LogOut, Flame, AlertCircle } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

interface Order {
  id: string;
  invoice_number: string;
  status: string;
  guest_count: number;
  prep_start_time: string | null;
  prep_end_time: string | null;
  created_at: string;
  table: { table_number: string };
  staff: { name: string };
  order_items: {
    id: string;
    quantity: number;
    notes: string | null;
    menu_item: { name: string; food_type: string };
  }[];
}

// Timer Component for live updates
const LiveTimer = ({ startTime, endTime, status }: { startTime: string | null, endTime: string | null, status: string }) => {
  const [elapsed, setElapsed] = useState('');
  const [isWarning, setIsWarning] = useState(false);
  const [isDanger, setIsDanger] = useState(false);

  useEffect(() => {
    if (!startTime) {
      setElapsed('Not Started');
      return;
    }

    const start = new Date(startTime).getTime();
    
    // If it's ready, calculate fixed duration
    if (status === 'READY' && endTime) {
      const end = new Date(endTime).getTime();
      const diff = Math.floor((end - start) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setElapsed(`${m}:${s}`);
      return;
    }

    // Live updating timer
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setElapsed(`${m}:${s}`);

      // Change colors based on wait time (warning at 10m, danger at 20m)
      if (diff > 1200) {
        setIsDanger(true);
        setIsWarning(false);
      } else if (diff > 600) {
        setIsWarning(true);
        setIsDanger(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime, status]);

  let colorClass = 'text-emerald-400';
  if (status === 'OPEN') colorClass = 'text-gray-400';
  else if (status === 'READY') colorClass = 'text-emerald-400';
  else if (isDanger) colorClass = 'text-red-400 animate-pulse';
  else if (isWarning) colorClass = 'text-amber-400';
  else colorClass = 'text-blue-400';

  return (
    <div className={`font-mono font-bold text-lg flex items-center gap-1.5 ${colorClass}`}>
      <Clock className="w-4 h-4" />
      {elapsed}
    </div>
  );
};

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/kds');
      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch KDS orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const updateOrderStatus = async (orderId: string, action: 'ACCEPT' | 'READY' | 'FINISH') => {
    // Optimistic UI Update
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        if (action === 'ACCEPT') return { ...o, status: 'PREPARING', prep_start_time: new Date().toISOString() };
        if (action === 'READY') return { ...o, status: 'READY', prep_end_time: new Date().toISOString() };
        if (action === 'FINISH') return { ...o, status: 'SERVED' }; // Will be filtered out
      }
      return o;
    }).filter(o => o.status !== 'SERVED'));

    try {
      const res = await fetch(`/api/kds/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (!res.ok) {
        toast.error('Failed to update order');
        fetchOrders(); // Revert on failure
      } else {
        if (action === 'READY') toast.success('Order marked as Ready!');
      }
    } catch {
      toast.error('Failed to update order');
      fetchOrders();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-emerald-500 flex flex-col items-center gap-3">
          <ChefHat className="w-12 h-12 animate-bounce" />
          <p className="font-mono text-sm tracking-widest uppercase">Loading Kitchen Display...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-100 p-4 font-sans selection:bg-emerald-500/30">
      {/* ──── Header ──── */}
      <header className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Kitchen Display System</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Live Sync Active</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{session?.user?.name || 'Chef'}</p>
            <p className="text-xs text-gray-400 capitalize">{session?.user?.role?.toLowerCase() || 'Kitchen Staff'}</p>
          </div>
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ──── Grid ──── */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[70vh] opacity-50">
          <ChefHat className="w-20 h-20 mb-4 text-gray-700" />
          <p className="text-xl font-medium text-gray-500">No active orders</p>
          <p className="text-sm text-gray-600 mt-1">Kitchen is caught up!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          <AnimatePresence>
            {orders.map((order) => {
              const isNew = order.status === 'OPEN';
              const isPrep = order.status === 'PREPARING';
              const isReady = order.status === 'READY';

              // Determine border and accent colors based on status
              let cardBorder = 'border-white/10';
              let headerBg = 'bg-white/5';
              if (isNew) {
                cardBorder = 'border-amber-500/30';
                headerBg = 'bg-amber-500/10';
              } else if (isPrep) {
                cardBorder = 'border-blue-500/30';
                headerBg = 'bg-blue-500/10';
              } else if (isReady) {
                cardBorder = 'border-emerald-500/30';
                headerBg = 'bg-emerald-500/10';
              }

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className={`flex flex-col rounded-2xl bg-[#141414] border ${cardBorder} shadow-2xl overflow-hidden`}
                >
                  {/* Card Header */}
                  <div className={`px-4 py-3 flex items-center justify-between ${headerBg} border-b ${cardBorder}`}>
                    <div>
                      <h2 className="text-lg font-black text-white">
                        Table {order.table.table_number}
                      </h2>
                      <p className="text-xs font-medium text-gray-400">
                        {order.staff.name} • {order.guest_count} Guests
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-0.5">
                        Time Elapsed
                      </p>
                      <LiveTimer 
                        startTime={order.prep_start_time} 
                        endTime={order.prep_end_time} 
                        status={order.status} 
                      />
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-2 flex-1 overflow-y-auto max-h-[400px]">
                    <div className="space-y-1">
                      {order.order_items.map((item, idx) => (
                        <div key={item.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex gap-3 items-start group">
                          <div className="flex-shrink-0 mt-1">
                            <span className={item.menu_item.food_type === 'VEG' ? 'veg-dot' : 'non-veg-dot'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-bold text-gray-100 leading-tight">
                                {item.menu_item.name}
                              </p>
                              <span className="text-lg font-black font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                x{item.quantity}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-xs text-amber-300 mt-1.5 flex items-start gap-1 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span>{item.notes}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer (Actions) */}
                  <div className={`p-3 border-t ${cardBorder} bg-black/20`}>
                    {isNew && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ACCEPT')}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wide transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
                      >
                        Accept Order
                      </button>
                    )}
                    {isPrep && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'READY')}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-wide transition-colors cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Mark as Ready
                      </button>
                    )}
                    {isReady && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'FINISH')}
                        className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 font-bold tracking-wide transition-colors cursor-pointer border border-white/10"
                      >
                        Clear from Board
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
