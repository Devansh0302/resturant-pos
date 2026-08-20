'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Clock, CheckCircle, ChefHat, LogOut, Flame, AlertCircle, Play, UtensilsCrossed, PlusCircle, ShoppingBag, Bike, Utensils, ClipboardList, X, Settings, Printer, MonitorSmartphone } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Order {
  id: string;
  invoice_number: string;
  status: string;
  guest_count: number;
  prep_start_time: string | null;
  prep_end_time: string | null;
  created_at: string;
  order_type: string;
  table: { table_number: string } | null;
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
      setElapsed('00:00');
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

  let colorClass = 'text-inherit';
  if (isDanger && status !== 'READY') colorClass = 'text-red-600 animate-pulse';
  else if (isWarning && status !== 'READY') colorClass = 'text-yellow-600';

  return (
    <div className={`font-mono font-bold text-xl flex items-center gap-1.5 ${colorClass}`}>
      <Clock className="w-4 h-4 opacity-80" />
      <span className="tracking-wider">{elapsed}</span>
    </div>
  );
};

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [fakeOrders, setFakeOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [kdsMode, setKdsMode] = useState<'digital' | 'print'>('digital');
  
  const kdsModeRef = useRef<'digital' | 'print'>('digital');
  const seenOrdersRef = useRef<Set<string>>(new Set());

  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Load saved settings
    const savedMode = localStorage.getItem('kdsMode') as 'digital' | 'print';
    if (savedMode) {
      setKdsMode(savedMode);
      kdsModeRef.current = savedMode;
    }
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      const role = (session.user as any).role;
      if (role !== 'CHEF' && role !== 'KITCHEN') {
        toast.error('Unauthorized access to KDS');
        router.push('/login');
      }
    }
  }, [status, session, router]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/kds');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data: Order[] = await res.json();
        
        // Auto-print logic
        if (kdsModeRef.current === 'print') {
          const newOrders = data.filter(o => o.status === 'OPEN' && !seenOrdersRef.current.has(o.id));
          if (newOrders.length > 0) {
            newOrders.forEach(o => {
              const identifier = o.table?.table_number ? `Table ${o.table.table_number}` : (o.order_type || 'Order');
              toast.info(`Printing KOT for ${identifier}...`, { icon: <Printer className="w-4 h-4" /> });
              // MOCK: In a real environment, trigger ESC/POS print command here or window.print()
            });
          }
        }
        
        // Update seen orders reference
        data.forEach(o => seenOrdersRef.current.add(o.id));
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch KDS orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistoryOrders = async () => {
    try {
      const res = await fetch('/api/kds/history');
      if (res.ok) {
        const data = await res.json();
        setHistoryOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch history orders:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    
    // Subscribe to Supabase Realtime
    const channel = supabase
      .channel('kds_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
        if (isSidebarOpen) fetchHistoryOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchOrders();
        if (isSidebarOpen) fetchHistoryOrders();
      })
      .subscribe();

    // Fallback Polling every 3 seconds
    const interval = setInterval(() => {
      fetchOrders();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isSidebarOpen]);

  // Fetch history when sidebar opens
  useEffect(() => {
    if (isSidebarOpen) {
      fetchHistoryOrders();
    }
  }, [isSidebarOpen]);

  const addFakeOrder = () => {
    const types = ['DINE_IN', 'TAKEAWAY', 'SWIGGY', 'ZOMATO'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const isTableOrder = randomType === 'DINE_IN';

    const newFakeOrder: Order = {
      id: `fake-${Date.now()}`,
      invoice_number: `INV-FAKE-${Date.now()}`,
      status: 'OPEN',
      guest_count: isTableOrder ? Math.floor(Math.random() * 6) + 1 : 1,
      prep_start_time: null,
      prep_end_time: null,
      created_at: new Date().toISOString(),
      order_type: randomType,
      table: isTableOrder ? { table_number: Math.floor(Math.random() * 20 + 1).toString() } : null,
      staff: { name: isTableOrder ? 'Test Waiter' : 'Online System' },
      order_items: [
        {
          id: `item-${Date.now()}-1`,
          quantity: 2,
          notes: Math.random() > 0.5 ? 'Extra spicy please' : null,
          menu_item: { name: 'Butter Chicken', food_type: 'NON_VEG' },
        },
        {
          id: `item-${Date.now()}-2`,
          quantity: 3,
          notes: null,
          menu_item: { name: 'Garlic Naan', food_type: 'VEG' },
        },
        {
          id: `item-${Date.now()}-3`,
          quantity: 1,
          notes: 'No ice',
          menu_item: { name: 'Mango Lassi', food_type: 'VEG' },
        }
      ],
    };
    setFakeOrders(prev => [newFakeOrder, ...prev]);
    toast.success(`Added ${randomType} order!`);
  };

  const updateOrderStatus = async (orderId: string, action: 'ACCEPT' | 'READY' | 'FINISH') => {
    if (processingIds.has(orderId)) return;
    
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.add(orderId);
      return next;
    });

    // Handle fake orders
    if (orderId.startsWith('fake-')) {
      setFakeOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          if (action === 'ACCEPT') return { ...o, status: 'PREPARING', prep_start_time: new Date().toISOString() };
          if (action === 'READY') return { ...o, status: 'READY', prep_end_time: new Date().toISOString() };
          if (action === 'FINISH') return { ...o, status: 'SERVED' }; 
        }
        return o;
      }));
      
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      if (action === 'READY') toast.success('Order marked as Ready!');
      return;
    }

    // Optimistic UI Update for real orders
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
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-emerald-500 flex flex-col items-center gap-4">
          <ChefHat className="w-16 h-16 animate-bounce" />
          <p className="font-mono text-sm tracking-widest uppercase font-bold text-gray-500">Loading KDS...</p>
        </div>
      </div>
    );
  }

  const activeFakeOrders = fakeOrders.filter(o => o.status !== 'SERVED');
  const displayOrders = [...activeFakeOrders, ...orders];
  const displayHistoryOrders = [...fakeOrders, ...historyOrders];

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-3 md:p-4 font-sans selection:bg-emerald-500/30 overflow-x-hidden relative">
      {/* ──── Header ──── */}
      <header className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 sticky top-0 bg-gray-100/95 backdrop-blur-xl z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shadow-md shadow-gray-900/20">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-gray-900 leading-none mt-1">KITCHEN DISPLAY</h1>
              <div className="px-2.5 py-0.5 bg-gray-900 text-white text-[10px] font-bold rounded-full shadow-sm mt-0.5">
                {displayOrders.length} {displayOrders.length === 1 ? 'Order' : 'Orders'}
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Live Sync Active</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={addFakeOrder}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Fake Order
          </button>

          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg font-bold text-xs shadow-sm transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Today's Bills
          </button>
          
          {currentTime && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono text-sm font-semibold text-gray-700 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>
          )}
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg font-bold text-xs shadow-sm transition-colors"
            title="KDS Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-gray-900 leading-tight">{session?.user?.name || 'Chef'}</p>
            <p className="text-[10px] text-gray-500 capitalize leading-tight">{session?.user?.role?.toLowerCase() || 'Kitchen Staff'}</p>
          </div>
          <button 
            onClick={() => signOut({ redirect: false }).then(() => { window.location.href = window.location.origin + '/login'; })}
            className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all cursor-pointer shadow-sm"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ──── Sidebar for Today's Bills ──── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200"
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 leading-tight">Today's Bills</h2>
                    <p className="text-xs text-gray-500 font-semibold">{displayHistoryOrders.length} Total Orders Today</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-10 h-10 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {displayHistoryOrders.length === 0 ? (
                  <div className="text-center text-gray-500 py-10 font-semibold">
                    No orders have been placed today.
                  </div>
                ) : (
                  displayHistoryOrders.map((histOrder) => {
                    const isServed = histOrder.status === 'SERVED' || histOrder.status === 'COMPLETED' || histOrder.status === 'PAID';
                    
                    let statusColor = 'text-gray-500 bg-gray-100';
                    if (histOrder.status === 'OPEN') statusColor = 'text-indigo-700 bg-indigo-100';
                    if (histOrder.status === 'PREPARING') statusColor = 'text-blue-700 bg-blue-100';
                    if (histOrder.status === 'READY') statusColor = 'text-emerald-700 bg-emerald-100';
                    if (isServed) statusColor = 'text-gray-500 bg-gray-200';

                    return (
                      <div key={histOrder.id} className={`p-3 rounded-xl bg-white border border-gray-200 shadow-sm ${isServed ? 'opacity-70' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 block mb-0.5">{histOrder.invoice_number}</span>
                            <h3 className="text-base font-black text-gray-900 leading-none">
                              {histOrder.table?.table_number ? `Table ${histOrder.table.table_number}` : (histOrder.order_type || 'KOT')}
                            </h3>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase ${statusColor}`}>
                            {histOrder.status}
                          </span>
                        </div>
                        
                        <div className="space-y-1.5 border-t border-gray-100 pt-2">
                          {histOrder.order_items.map(item => (
                            <div key={item.id} className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-gray-700">{item.menu_item.name}</span>
                              <span className="font-black text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 text-[10px] font-bold text-gray-400 text-right">
                          Placed at {new Date(histOrder.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ──── Grid ──── */}
      {displayOrders.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center h-[50vh]"
        >
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm border border-gray-100">
            <ChefHat className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-xl font-bold text-gray-700">No active orders</p>
          <p className="text-gray-500 mt-1 text-sm">Kitchen is all caught up! Great job.</p>
          <button 
            onClick={addFakeOrder}
            className="mt-6 md:hidden flex items-center gap-2 px-5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-sm shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Add Fake Order
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 items-start auto-rows-max">
          <AnimatePresence mode="popLayout">
            {displayOrders.map((order) => {
              const isNew = order.status === 'OPEN';
              const isPrep = order.status === 'PREPARING';
              const isReady = order.status === 'READY';

              let cardBg = 'bg-white';
              let headerBg = 'bg-gray-100';
              let headerText = 'text-gray-900';
              let borderColor = 'border-gray-200';
              let statusLabel = '';
              let StatusIcon = Clock;
              let footerBg = 'bg-gray-50';

              if (isNew) {
                headerBg = 'bg-amber-400';
                headerText = 'text-amber-950';
                borderColor = 'border-amber-400';
                statusLabel = 'NEW ORDER';
                StatusIcon = AlertCircle;
                footerBg = 'bg-amber-50';
              } else if (isPrep) {
                headerBg = 'bg-blue-500';
                headerText = 'text-white';
                borderColor = 'border-blue-500';
                statusLabel = 'PREPARING';
                StatusIcon = Flame;
                footerBg = 'bg-blue-50';
              } else if (isReady) {
                headerBg = 'bg-emerald-500';
                headerText = 'text-white';
                borderColor = 'border-emerald-500';
                statusLabel = 'READY TO SERVE';
                StatusIcon = CheckCircle;
                footerBg = 'bg-emerald-50';
              }

              let typeBadgeClass = 'bg-white text-gray-600 border-gray-300';
              let typeLabel = 'Dine In';
              let TypeIcon = Utensils;
              
              if (order.order_type === 'SWIGGY') {
                typeLabel = 'Swiggy';
                TypeIcon = Bike;
              } else if (order.order_type === 'ZOMATO') {
                typeLabel = 'Zomato';
                TypeIcon = Bike;
              } else if (order.order_type === 'TAKEAWAY') {
                typeLabel = 'Takeaway';
                TypeIcon = ShoppingBag;
              } else {
                typeLabel = 'Dine In';
                TypeIcon = Utensils;
              }

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -15, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3 }}
                  className={`flex flex-col rounded-xl ${cardBg} border-2 ${borderColor} shadow-sm overflow-hidden`}
                >
                  {/* Card Header */}
                  <div className={`px-4 py-3 ${headerBg} flex flex-col gap-2 relative overflow-hidden`}>
                    <div className="absolute -top-4 -right-4 p-4 opacity-10 pointer-events-none transform rotate-12 text-current">
                      <StatusIcon className="w-24 h-24" />
                    </div>
                    
                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-bold tracking-widest uppercase opacity-90 ${headerText} mb-1`}>
                          {statusLabel}
                        </span>
                        <h2 className={`text-3xl font-black tracking-tight leading-none ${headerText}`}>
                          {order.table?.table_number ? (order.table.table_number.toUpperCase().startsWith('T') ? order.table.table_number : `T-${order.table.table_number}`) : 'KOT'}
                        </h2>
                      </div>
                      <div className={`text-right flex flex-col items-end px-3 py-1.5 rounded-lg bg-black/10 backdrop-blur-sm ${headerText}`}>
                        <LiveTimer 
                          startTime={isNew ? order.created_at : order.prep_start_time} 
                          endTime={order.prep_end_time} 
                          status={order.status} 
                        />
                      </div>
                    </div>
                    
                    <div className={`flex items-center justify-between text-[11px] font-bold opacity-90 ${headerText} relative z-10 mt-1`}>
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[100px]">{order.staff.name}</span>
                        {order.guest_count > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                            <span>{order.guest_count} Guests</span>
                          </>
                        )}
                      </div>
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/10`}>
                        <TypeIcon className="w-3 h-3" />
                        {typeLabel}
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-2 flex-1 overflow-y-auto max-h-[350px] bg-white custom-scrollbar">
                    <div className="space-y-1">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="p-3 rounded-lg hover:bg-gray-50 transition-colors flex gap-3 items-start group border-b border-gray-100 last:border-0">
                          <div className="flex-shrink-0 mt-1">
                            <span className={`flex w-3 h-3 rounded-sm ${item.menu_item.food_type === 'VEG' ? 'bg-green-500' : 'bg-red-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-base font-bold text-gray-900 leading-tight">
                                {item.menu_item.name}
                              </p>
                              <span className="text-lg font-black font-mono text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md shadow-sm flex-shrink-0 leading-none">
                                x{item.quantity}
                              </span>
                            </div>
                            {item.notes && (
                              <div className="mt-2 flex items-start gap-1.5 bg-amber-50 text-amber-800 p-2 rounded-md text-sm font-semibold border border-amber-200">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span className="leading-tight">{item.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer (Actions) */}
                  <div className={`p-3 ${footerBg} border-t ${borderColor}`}>
                    {isNew && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ACCEPT')}
                        disabled={processingIds.has(order.id)}
                        className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm tracking-widest uppercase transition-all cursor-pointer shadow-lg shadow-amber-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Play className="w-5 h-5" fill="currentColor" />
                        {processingIds.has(order.id) ? 'ACCEPTING...' : 'START PREP'}
                      </button>
                    )}
                    {isPrep && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'READY')}
                        disabled={processingIds.has(order.id)}
                        className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm tracking-widest uppercase transition-all cursor-pointer shadow-lg shadow-blue-600/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <UtensilsCrossed className="w-5 h-5" />
                        {processingIds.has(order.id) ? 'UPDATING...' : 'MARK READY'}
                      </button>
                    )}
                    {isReady && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'FINISH')}
                        disabled={processingIds.has(order.id)}
                        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm tracking-widest uppercase transition-all cursor-pointer shadow-lg shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        {processingIds.has(order.id) ? 'CLEARING...' : 'SERVE ORDER'}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ──── Settings Modal ──── */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-200"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2 text-gray-900">
                  <Settings className="w-5 h-5" />
                  <h3 className="font-bold text-lg">KDS Settings</h3>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Choose how this station handles incoming orders. Settings are saved locally on this device.
                </p>
                
                <div className="space-y-3">
                  {/* Digital Mode Option */}
                  <label 
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                      kdsMode === 'digital' ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="kdsMode" 
                      value="digital" 
                      checked={kdsMode === 'digital'}
                      onChange={() => {
                        setKdsMode('digital');
                        kdsModeRef.current = 'digital';
                        localStorage.setItem('kdsMode', 'digital');
                        toast.success('Switched to Digital Mode');
                      }}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <MonitorSmartphone className={`w-4 h-4 ${kdsMode === 'digital' ? 'text-indigo-600' : 'text-gray-500'}`} />
                        <span className="font-bold text-sm text-gray-900">Digital Mode</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 font-medium leading-tight">
                        Orders appear on screen. Chefs interact directly with the display to update status. No automatic printing.
                      </p>
                    </div>
                  </label>

                  {/* Auto-Print Option */}
                  <label 
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                      kdsMode === 'print' ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="kdsMode" 
                      value="print" 
                      checked={kdsMode === 'print'}
                      onChange={() => {
                        setKdsMode('print');
                        kdsModeRef.current = 'print';
                        localStorage.setItem('kdsMode', 'print');
                        toast.success('Switched to Auto-Print Mode');
                      }}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Printer className={`w-4 h-4 ${kdsMode === 'print' ? 'text-indigo-600' : 'text-gray-500'}`} />
                        <span className="font-bold text-sm text-gray-900">Auto-Print Mode</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 font-medium leading-tight">
                        A KOT (Kitchen Order Ticket) is automatically printed when a new order is received.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-5 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm shadow-sm transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
