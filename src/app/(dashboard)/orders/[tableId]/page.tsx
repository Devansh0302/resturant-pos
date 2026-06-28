'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useOrderStore } from '@/store/order-store';
import {
  Search, Plus, Minus, Trash2, Printer, FileText,
  X, ArrowLeft, Users, Loader2, AlertTriangle,
  CreditCard, Smartphone, Banknote, MessageCircle, Send, ChefHat,
  CheckCircle, Flame, ArrowRight, Save, ReceiptIndianRupee
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { calculateGST, formatPriceShort } from '@/lib/gst';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  food_type: 'VEG' | 'NON_VEG';
  is_available: boolean;
  category: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
  items: MenuItem[];
}

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const tableId = params.tableId as string;

  const {
    items, orderId, guestCount, notes,
    setTableId, setOrderId, setGuestCount, setNotes,
    addItem, removeItem, updateQuantity, clearOrder,
    setItemsFromAPI, getSubtotal, getItemQuantity
  } = useOrderStore();

  const [menuCategories, setMenuCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showKotModal, setShowKotModal] = useState(false);
  const [kotData, setKotData] = useState<any>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [customerName, setCustomerName] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPrintingKOT, setIsPrintingKOT] = useState(false);

  const subtotal = getSubtotal();
  const gst = calculateGST(subtotal);

  // Use a ref to track saving state in background intervals without closure staleness
  const isSavingRef = useRef(false);

  useEffect(() => {
    setTableId(tableId);
    fetchMenu();
    fetchTableAndOrder();

    // Subscribe to Supabase Realtime to instantly update the order if someone else modifies it
    const channel = supabase
      .channel(`order_channel_${tableId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchTableAndOrder(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchTableAndOrder(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId]);

  const fetchMenu = async () => {
    try {
      const res = await fetch('/api/menu');
      const data = await res.json();
      setMenuCategories(data);
    } catch (error) {
      console.error('Failed to fetch menu:', error);
    }
  };

  const fetchTableAndOrder = async (showLoading = true) => {
    // Skip background sync if we are currently saving to avoid overwriting local edits
    if (!showLoading && isSavingRef.current) return;
    
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch('/api/tables');
      const tables = await res.json();
      const table = tables.find((t: any) => t.id === tableId);
      setTableInfo(table);

      if (table?.activeOrder) {
        setOrderId(table.activeOrder.id);
        setGuestCount(table.activeOrder.guest_count);
        const mappedItems = table.activeOrder.order_items.map((oi: any) => ({
          id: oi.id,
          menu_item_id: oi.menu_item_id,
          name: oi.menu_item.name,
          food_type: oi.menu_item.food_type,
          quantity: oi.quantity,
          unit_price: oi.unit_price,
          total_price: oi.total_price,
          notes: oi.notes,
        }));
        setItemsFromAPI(mappedItems);
      } else {
        // Only clear if we explicitly know it's a new empty table (prevents wiping during a slow load)
        if (showLoading) {
          clearOrder();
          setTableId(tableId);
        }
      }
    } catch (error) {
      console.error('Failed to fetch table:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleAddItem = (menuItem: MenuItem) => {
    addItem({
      menu_item_id: menuItem.id,
      name: menuItem.name,
      food_type: menuItem.food_type,
      unit_price: menuItem.price,
    });
  };

  const saveOrder = useCallback(async () => {
    if (items.length === 0) return;
    setIsSaving(true);
    isSavingRef.current = true;

    try {
      if (orderId) {
        // Update existing order
        await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map(i => ({
              menu_item_id: i.menu_item_id,
              quantity: i.quantity,
              unit_price: i.unit_price,
              notes: i.notes,
            })),
            notes,
            guest_count: guestCount,
          }),
        });
      } else {
        // Create new order
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_id: tableId,
            staff_id: (session?.user as any)?.id,
            guest_count: guestCount,
            items: items.map(i => ({
              menu_item_id: i.menu_item_id,
              quantity: i.quantity,
              unit_price: i.unit_price,
              notes: i.notes,
            })),
            notes,
          }),
        });
        const data = await res.json();
        setOrderId(data.id);
      }
    } catch (error) {
      console.error('Failed to save order:', error);
      toast.error('Failed to save order');
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [items, guestCount, notes, orderId, tableId, session]);

  // Auto-save on item changes
  useEffect(() => {
    if (items.length > 0 && !isLoading) {
      const timeout = setTimeout(saveOrder, 800);
      return () => clearTimeout(timeout);
    }
  }, [items, saveOrder, isLoading]);

  const handlePrintKOT = async () => {
    if (!orderId) {
      toast.error('Save the order first');
      return;
    }
    setIsPrintingKOT(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/kot`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.message === 'No pending items for KOT') {
          toast.success('No new items to send to Kitchen');
          return;
        }
        toast.success('Order sent to kitchen', { description: 'Items have been dispatched to the KDS' });
      } else {
        toast.error('Failed to send to kitchen');
      }
    } catch {
      toast.error('Failed to send to kitchen');
    } finally {
      setIsPrintingKOT(false);
    }
  };

  const handleGenerateBill = async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/bill`, { method: 'POST' });
      if (res.ok) {
        setShowBillModal(true);
      } else {
        toast.error('Failed to generate bill');
      }
    } catch {
      toast.error('Failed to generate bill');
    }
  };

  const handleRequestAction = async (action: 'KOT' | 'BILL') => {
    if (!orderId) {
      toast.error('Save the order first');
      return;
    }
    
    if (action === 'KOT') setIsPrintingKOT(true);
    
    try {
      const res = await fetch(`/api/orders/${orderId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        toast.success(`${action} requested`, { description: `Admin has been notified to print the ${action}` });
      } else {
        toast.error(`Failed to request ${action}`);
      }
    } catch {
      toast.error(`Error requesting ${action}`);
    } finally {
      if (action === 'KOT') setIsPrintingKOT(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!orderId) return;
    setIsProcessingPayment(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_mode: paymentMode }),
      });
      if (res.ok) {
        toast.success('Payment received', { description: `Paid via ${paymentMode}` });
        setShowBillModal(false);
        clearOrder();
        router.push('/tables');
      } else {
        toast.error('Payment failed');
      }
    } catch {
      toast.error('Payment failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCancelOrder = async () => {
    if (orderId) {
      try {
        await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CANCELLED' }),
        });
      } catch {
        toast.error('Failed to cancel order');
        return;
      }
    }
    toast.success('Order cancelled');
    clearOrder();
    router.push('/tables');
  };

  const handlePrintBill = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const text = `*SPICE ROUTE*%0AMG Road, Jaipur%0A%0ATable: ${tableInfo?.table_number}%0AGuests: ${guestCount}%0A%0A${items.map(i => `${i.name} x${i.quantity} - ₹${i.total_price}`).join('%0A')}%0A%0ASubtotal: ₹${subtotal.toFixed(2)}%0ACGST 2.5%: ₹${gst.cgst.toFixed(2)}%0ASGST 2.5%: ₹${gst.sgst.toFixed(2)}%0A*Total: ₹${gst.total.toFixed(2)}*%0A%0AThank you for dining with us!`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Flatten menu items for display
  const allMenuItems = menuCategories.flatMap(c => c.items);
  const filteredItems = allMenuItems.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category.id === activeCategory;
    const matchesSearch = searchQuery === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#10B981' }} />
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-6" style={{ height: 'calc(100vh - 48px)' }}>
        {/* ──── LEFT: Menu Panel (60%) ──── */}
        <div className="flex-[3] flex flex-col min-w-0">
          {/* Back + Table info */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push('/tables')}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{ backgroundColor: '#F3F4F6' }}
            >
              <ArrowLeft className="w-4 h-4" style={{ color: '#6B7280' }} />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#1A1A1A' }}>
                {tableInfo?.table_number || 'New Order'}
              </h1>
              <p className="text-xs" style={{ color: '#6B7280' }}>
                {tableInfo?.area?.charAt(0) + tableInfo?.area?.slice(1).toLowerCase()} · {tableInfo?.capacity} seats
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1A1A1A' }}
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveCategory('all')}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer"
              style={{
                backgroundColor: activeCategory === 'all' ? '#10B981' : '#FFFFFF',
                color: activeCategory === 'all' ? '#FFFFFF' : '#6B7280',
                border: `1px solid ${activeCategory === 'all' ? '#10B981' : '#E5E7EB'}`,
              }}
            >
              All
            </button>
            {menuCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: activeCategory === cat.id ? '#10B981' : '#FFFFFF',
                  color: activeCategory === cat.id ? '#FFFFFF' : '#6B7280',
                  border: `1px solid ${activeCategory === cat.id ? '#10B981' : '#E5E7EB'}`,
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 content-start pb-4">
            {filteredItems.map((item, index) => {
              const qty = getItemQuantity(item.id);
              return (
                <motion.div
                  key={`menu-${item.id}-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl p-4 flex flex-col justify-between relative"
                  style={{
                    backgroundColor: item.is_available ? '#FFFFFF' : '#F9FAFB',
                    border: qty > 0 ? '2px solid #10B981' : '1px solid #E5E7EB',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    opacity: item.is_available ? 1 : 0.6,
                  }}
                >
                  <div>
                    <div className="flex items-start gap-2">
                      <span className={item.food_type === 'VEG' ? 'veg-dot' : 'non-veg-dot'} style={{ marginTop: '5px' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-[11px] truncate mt-0.5" style={{ color: '#9CA3AF' }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span
                      className="text-sm font-semibold"
                      style={{ fontFamily: 'var(--font-mono)', color: '#1A1A1A' }}
                    >
                      ₹{item.price}
                    </span>
                    {qty > 0 ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, qty - 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                          style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-semibold w-5 text-center" style={{ fontFamily: 'var(--font-mono)' }}>
                          {qty}
                        </span>
                        <button
                          onClick={() => item.is_available && updateQuantity(item.id, qty + 1)}
                          disabled={!item.is_available}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${item.is_available ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                          style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddItem(item)}
                        disabled={!item.is_available}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${item.is_available ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        style={{ 
                          backgroundColor: item.is_available ? '#ECFDF5' : '#F3F4F6', 
                          color: item.is_available ? '#10B981' : '#9CA3AF', 
                          border: `1px solid ${item.is_available ? '#D1FAE5' : '#E5E7EB'}` 
                        }}
                      >
                        {item.is_available ? 'Add' : 'Unavailable'}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ──── RIGHT: Order Summary (40%) ──── */}
        <div
          className="flex-[2] flex flex-col rounded-xl"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {/* Header */}
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#1A1A1A' }}>
                Order — {tableInfo?.table_number}
              </h2>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#6B7280' }} />}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <label className="text-xs" style={{ color: '#6B7280' }}>Guests</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                  className="w-6 h-6 rounded flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: '#F3F4F6' }}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-semibold w-6 text-center" style={{ fontFamily: 'var(--font-mono)' }}>
                  {guestCount}
                </span>
                <button
                  onClick={() => setGuestCount(guestCount + 1)}
                  className="w-6 h-6 rounded flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: '#F3F4F6' }}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <FileText className="w-10 h-10 mb-3" style={{ color: '#D1D5DB' }} />
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>No items added yet</p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Browse the menu and add items</p>
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={`cart-${item.menu_item_id}-${index}`}
                  className="flex items-center gap-3 py-2.5 group"
                  style={{ borderBottom: '1px solid #F3F4F6' }}
                >
                  <span className={item.food_type === 'VEG' ? 'veg-dot' : 'non-veg-dot'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>{item.name}</p>
                    <p className="text-[11px]" style={{ color: '#9CA3AF', fontFamily: 'var(--font-mono)' }}>
                      ₹{item.unit_price} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                      className="w-6 h-6 rounded flex items-center justify-center cursor-pointer"
                      style={{ backgroundColor: '#F3F4F6' }}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-semibold w-4 text-center" style={{ fontFamily: 'var(--font-mono)' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center cursor-pointer"
                      style={{ backgroundColor: '#F3F4F6' }}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span
                    className="text-sm font-semibold min-w-[60px]"
                    style={{ fontFamily: 'var(--font-mono)', color: '#1A1A1A', textAlign: 'right' }}
                  >
                    ₹{item.total_price}
                  </span>
                  <button
                    onClick={() => removeItem(item.menu_item_id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                    style={{ color: '#EF4444' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div className="px-5 py-4" style={{ borderTop: '1px solid #E5E7EB' }}>
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#6B7280' }}>Subtotal</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#1A1A1A' }}>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#9CA3AF' }}>CGST 2.5%</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#9CA3AF' }}>₹{gst.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#9CA3AF' }}>SGST 2.5%</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#9CA3AF' }}>₹{gst.sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2" style={{ borderTop: '1px solid #E5E7EB' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', color: '#1A1A1A' }}>Grand Total</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#F97316' }}>₹{gst.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Notes */}
              <textarea
                placeholder="Order notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-xs resize-none outline-none mb-3"
                style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#1A1A1A' }}
              />

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handlePrintKOT}
                  disabled={isPrintingKOT || !orderId}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: '#FFFFFF', color: '#10B981', border: '1px solid #10B981' }}
                >
                  {isPrintingKOT ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChefHat className="w-4 h-4" />}
                  Send to Kitchen
                </button>
                
                {(session?.user as any)?.role === 'WAITER' ? (
                  <button
                    onClick={() => handleRequestAction('BILL')}
                    disabled={!orderId}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: '#10B981' }}
                  >
                    <FileText className="w-4 h-4" />
                    Request Bill
                  </button>
                ) : (
                  <button
                    onClick={handleGenerateBill}
                    disabled={!orderId}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: '#10B981' }}
                  >
                    <FileText className="w-4 h-4" />
                    Generate Bill
                  </button>
                )}
                <button
                  onClick={() => setShowCancelDialog(true)}
                  className="w-full py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
                  style={{ color: '#EF4444' }}
                >
                  Cancel Order
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──── BILL MODAL ──── */}
      {showBillModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            {/* Print Area */}
            <div className="print-area">
              <div className="text-center p-5 pb-3">
                <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>SPICE ROUTE</h2>
                <p className="text-xs" style={{ color: '#6B7280' }}>MG Road, Jaipur</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>GSTIN: 08ABCDE1234F1Z5</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>Ph: +91 98765 43210</p>
              </div>

              <div className="px-5 py-4 text-xs space-y-1.5" style={{ borderTop: '1px dashed #E5E7EB', borderBottom: '1px dashed #E5E7EB' }}>
                <div className="flex justify-between">
                  <span style={{ color: '#6B7280' }}>Invoice</span>
                  <span className="font-mono font-medium">SR-2025-0001</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#6B7280' }}>Date</span>
                  <span>{new Date().toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#6B7280' }}>Table</span>
                  <span>{tableInfo?.table_number}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#6B7280' }}>Guests</span>
                  <span>{guestCount}</span>
                </div>
                {customerName && (
                  <div className="flex justify-between">
                    <span style={{ color: '#6B7280' }}>Customer</span>
                    <span className="font-medium">{customerName}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="px-5 py-4">
                <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
                  <thead>
                    <tr>
                      <th className="text-left py-2 pb-3 font-medium" style={{ color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Item</th>
                      <th className="text-center py-2 pb-3 px-2 font-medium" style={{ color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Qty</th>
                      <th className="text-right py-2 pb-3 pl-2 font-medium" style={{ color: '#6B7280', fontFamily: 'var(--font-mono)', borderBottom: '1px solid #E5E7EB' }}>Rate</th>
                      <th className="text-right py-2 pb-3 pl-2 font-medium" style={{ color: '#6B7280', fontFamily: 'var(--font-mono)', borderBottom: '1px solid #E5E7EB' }}>Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={`receipt-${item.menu_item_id}-${index}`}>
                        <td className="py-3 pr-2" style={{ borderBottom: '1px solid #F9FAFB' }}>
                          <p className="text-[13px] font-medium leading-relaxed" style={{ color: '#1A1A1A' }}>{item.name}</p></td>
                        <td className="text-center py-3 px-2 align-top" style={{ fontFamily: 'var(--font-mono)', borderBottom: '1px solid #F9FAFB' }}>{item.quantity}</td>
                        <td className="text-right py-3 pl-2 align-top" style={{ fontFamily: 'var(--font-mono)', borderBottom: '1px solid #F9FAFB' }}>₹{item.unit_price}</td>
                        <td className="text-right py-3 pl-2 font-medium align-top" style={{ fontFamily: 'var(--font-mono)', borderBottom: '1px solid #F9FAFB' }}>₹{item.total_price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="px-5 py-4 space-y-2" style={{ borderTop: '1px dashed #E5E7EB' }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#6B7280' }}>Subtotal</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#9CA3AF' }}>CGST 2.5%</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#9CA3AF' }}>₹{gst.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#9CA3AF' }}>SGST 2.5%</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#9CA3AF' }}>₹{gst.sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2" style={{ borderTop: '1px solid #E5E7EB' }}>
                  <span>Grand Total</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#F97316' }}>₹{gst.total.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-center text-[10px] pb-4" style={{ color: '#9CA3AF' }}>
                Thank you for dining with us! 🙏
              </p>
            </div>

            {/* Payment Controls (no-print) */}
            <div className="no-print px-5 py-4 space-y-4" style={{ borderTop: '1px solid #E5E7EB' }}>
              {/* Customer Name */}
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Customer Name (Optional)</p>
                <input
                  type="text"
                  placeholder="Enter name for the bill..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ border: '1px solid #E5E7EB', color: '#1A1A1A' }}
                />
              </div>

              {/* Payment Mode */}
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Payment Mode</p>
                <div className="flex gap-2">
                  {[
                    { mode: 'CASH', icon: Banknote, label: 'Cash' },
                    { mode: 'UPI', icon: Smartphone, label: 'UPI' },
                    { mode: 'CARD', icon: CreditCard, label: 'Card' },
                  ].map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setPaymentMode(mode)}
                      className="flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      style={{
                        backgroundColor: paymentMode === mode ? '#10B981' : '#FFFFFF',
                        color: paymentMode === mode ? '#FFFFFF' : '#6B7280',
                        border: `1px solid ${paymentMode === mode ? '#10B981' : '#E5E7EB'}`,
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={handleConfirmPayment}
                disabled={isProcessingPayment}
                className="w-full py-3 rounded-lg text-sm font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: '#10B981' }}
              >
                {isProcessingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirm Payment — ₹{gst.total.toFixed(2)}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handlePrintBill}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  style={{ backgroundColor: '#F3F4F6', color: '#1A1A1A' }}
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Bill
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  style={{ backgroundColor: '#ECFDF5', color: '#16A34A' }}
                >
                  <Send className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
              </div>

              <button
                onClick={() => setShowBillModal(false)}
                className="w-full py-2 text-xs cursor-pointer"
                style={{ color: '#6B7280' }}
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ──── KOT MODAL ──── */}
      {showKotModal && kotData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            {/* Print Area */}
            <div className="print-area font-mono" style={{ padding: '20px' }}>
              <div className="text-center pb-4" style={{ borderBottom: '2px dashed #000', marginBottom: '10px' }}>
                <h2 className="text-2xl font-bold" style={{ marginBottom: '4px' }}>K O T</h2>
                <h3 className="text-lg font-bold">Table: {tableInfo?.table_number || 'Takeaway'}</h3>
                <p className="text-sm mt-1">{new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>

              <div className="flex justify-between text-sm mb-4 font-bold">
                <span>Order: {kotData.kot_number}</span>
                <span>Guests: {guestCount}</span>
              </div>

              {/* Items */}
              <div className="pb-4">
                <table className="w-full text-sm font-bold" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #000' }}>
                      <th className="text-center py-2 w-12 border-b-2 border-black">QTY</th>
                      <th className="text-left py-2 pl-2 border-b-2 border-black">ITEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {JSON.parse(kotData.items || '[]').map((item: any, index: number) => (
                      <tr key={`kot-${index}`} style={{ borderBottom: '1px dashed #CCC' }}>
                        <td className="text-center py-3 align-top text-lg">{item.quantity}</td>
                        <td className="py-3 pl-2">
                          <p className="text-base uppercase">{item.name}</p>
                          {item.notes && <p className="text-xs font-normal text-gray-600 mt-1">* {item.notes}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Modal Actions */}
            <div className="no-print flex justify-between items-center px-5 py-4 border-t border-gray-100 rounded-b-xl" style={{ backgroundColor: '#F9FAFB' }}>
              <button
                onClick={() => setShowKotModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Ticket
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ──── CANCEL DIALOG ──── */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-xl p-6"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF2F2' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#1A1A1A' }}>Cancel Order?</h3>
                <p className="text-xs" style={{ color: '#6B7280' }}>This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer"
                style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
              >
                Keep Order
              </button>
              <button
                onClick={() => { setShowCancelDialog(false); handleCancelOrder(); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer"
                style={{ backgroundColor: '#EF4444' }}
              >
                Cancel Order
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
