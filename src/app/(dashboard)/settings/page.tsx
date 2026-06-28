'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Save, Loader2, Settings, History, CreditCard, Crown, Calendar,
  TrendingUp, Receipt, Download, ChevronDown, ChevronRight,
  ArrowUpRight, ArrowDownRight, RefreshCw, Zap, Shield, X,
  CheckCircle2, XCircle, Clock, Filter, IndianRupee, Wallet,
  FileText, ExternalLink, Copy, Smartphone
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────
interface SubscriptionRecord {
  id: string;
  invoice_number: string;
  plan_name: string;
  plan_type: string;
  billing_cycle: string | null;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  transaction_id: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  created_at: string;
}

interface SubscriptionData {
  history: SubscriptionRecord[];
  subscription: {
    status: string;
    endDate: string;
    currentPlan: string;
    currentPlanType: string;
  };
  stats: {
    totalSpent: number;
    totalTax: number;
    totalPayments: number;
    daysSinceFirst: number;
    averagePerPayment: number;
    paymentMethodBreakdown: Record<string, { count: number; total: number }>;
  };
  years: number[];
}

// ─── Helper functions ───────────────────────────────────
const formatCurrency = (val: number) =>
  `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

const formatFullDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

const daysRemaining = (endDate: string) => {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const eventTypeConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  NEW: { label: 'New', color: '#2563EB', bg: '#EFF6FF', icon: Zap },
  RENEWAL: { label: 'Renewal', color: '#059669', bg: '#ECFDF5', icon: RefreshCw },
  UPGRADE: { label: 'Upgrade', color: '#7C3AED', bg: '#F5F3FF', icon: ArrowUpRight },
  DOWNGRADE: { label: 'Downgrade', color: '#EA580C', bg: '#FFF7ED', icon: ArrowDownRight },
  CANCELLATION: { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
  REFUND: { label: 'Refund', color: '#DC2626', bg: '#FEF2F2', icon: ArrowDownRight },
};

const paymentStatusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PAID: { label: 'Paid', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  PENDING: { label: 'Pending', color: '#D97706', bg: '#FFFBEB', icon: Clock },
  FAILED: { label: 'Failed', color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
  REFUNDED: { label: 'Refunded', color: '#6B7280', bg: '#F3F4F6', icon: ArrowDownRight },
};

const paymentMethodIcon: Record<string, string> = {
  UPI: '📱',
  CARD: '💳',
  NETBANKING: '🏦',
  CASH: '💵',
};

// ─── Invoice Detail Modal ───────────────────────────────
function InvoiceModal({ record, onClose }: { record: SubscriptionRecord; onClose: () => void }) {
  const statusCfg = paymentStatusConfig[record.payment_status] || paymentStatusConfig.PAID;
  const eventCfg = eventTypeConfig[record.event_type] || eventTypeConfig.RENEWAL;

  const handleCopyTxn = () => {
    if (record.transaction_id) {
      navigator.clipboard.writeText(record.transaction_id);
      toast.success('Transaction ID copied');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="modal-content"
        style={{ maxWidth: '520px' }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #ECFDF5, #F0FDF4)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>Invoice Details</h3>
              <p className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-mono)' }}>{record.invoice_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body space-y-5">
          {/* Status + Event badges */}
          <div className="flex items-center gap-2">
            <span className="badge" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
              <statusCfg.icon className="w-3 h-3" />
              {statusCfg.label}
            </span>
            <span className="badge" style={{ backgroundColor: eventCfg.bg, color: eventCfg.color }}>
              <eventCfg.icon className="w-3 h-3" />
              {eventCfg.label}
            </span>
          </div>

          {/* Plan Info */}
          <div className="premium-card p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 mb-1">Plan</p>
                <p className="text-sm font-bold text-gray-900">{record.plan_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{record.billing_cycle || `${formatDate(record.starts_at)} – ${formatDate(record.ends_at)}`}</p>
              </div>
              <span className="badge badge-emerald text-[10px]">{record.plan_type}</span>
            </div>
          </div>

          {/* Amount Breakdown */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Breakdown</p>
            <div className="premium-card p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(record.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST (18%)</span>
                <span className="font-medium text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(record.tax_amount)}</span>
              </div>
              <div className="border-t border-dashed border-gray-200 pt-2.5 flex justify-between text-sm">
                <span className="font-bold text-gray-900">Total Paid</span>
                <span className="font-bold text-[#10B981] text-base" style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(record.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Details</p>
            <div className="premium-card p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Method</span>
                <span className="font-medium text-gray-900">{paymentMethodIcon[record.payment_method] || '💰'} {record.payment_method}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Date</span>
                <span className="font-medium text-gray-900">{formatFullDate(record.created_at)}</span>
              </div>
              {record.transaction_id && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Transaction ID</span>
                  <button onClick={handleCopyTxn} className="flex items-center gap-1.5 text-gray-900 hover:text-[#10B981] transition-colors">
                    <span className="font-medium" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{record.transaction_id}</span>
                    <Copy className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {record.notes && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">{record.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button className="btn-primary flex-1" style={{ fontSize: '13px' }}>
              <Download className="w-4 h-4" />
              Download Invoice
            </button>
            <button className="btn-secondary" style={{ fontSize: '13px' }}>
              <ExternalLink className="w-4 h-4" />
              View Receipt
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Settings Page ─────────────────────────────────
export default function SettingsPage() {
  const [form, setForm] = useState({ 
    name: '', address: '', phone: '', gstin: '', cgst_rate: '2.5', sgst_rate: '2.5',
    swiggy_enabled: false, swiggy_api_key: '',
    zomato_enabled: false, zomato_api_key: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  // Subscription state
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [yearFilter, setYearFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<SubscriptionRecord | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('annual');

  // Fetch restaurant settings
  useEffect(() => {
    fetch('/api/restaurant')
      .then(r => r.json())
      .then(data => {
        if (data) {
          setForm({
            name: data.name || '', address: data.address || '', phone: data.phone || '',
            gstin: data.gstin || '', cgst_rate: data.cgst_rate?.toString() || '2.5',
            sgst_rate: data.sgst_rate?.toString() || '2.5',
            swiggy_enabled: data.swiggy_enabled || false,
            swiggy_api_key: data.swiggy_api_key || '',
            zomato_enabled: data.zomato_enabled || false,
            zomato_api_key: data.zomato_api_key || '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsFetching(false));
  }, []);

  // Fetch subscription data
  const fetchSubscription = useCallback(async () => {
    setSubLoading(true);
    try {
      const params = new URLSearchParams();
      if (yearFilter !== 'all') params.set('year', yearFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/subscription?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSubData(data);
      }
    } catch {
      toast.error('Failed to load subscription data');
    } finally {
      setSubLoading(false);
    }
  }, [yearFilter, statusFilter]);

  useEffect(() => {
    if (activeTab === 'subscription') {
      fetchSubscription();
    }
  }, [activeTab, fetchSubscription]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/restaurant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Settings saved successfully');
        window.dispatchEvent(new Event('integrationsUpdated'));
      }
      else toast.error('Failed to save settings');
    } catch { toast.error('Failed to save settings'); }
    finally { setIsLoading(false); }
  };

  const router = useRouter();

  const handleRenew = async () => {
    setIsRenewing(true);
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan })
      });
      
      const data = await res.json();
      
      if (res.ok && data.url) {
        toast.success('Redirecting to Checkout...');
        router.push(data.url);
      } else {
        toast.error(data.error || 'Failed to initialize checkout');
        setIsRenewing(false);
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
      setIsRenewing(false);
    }
  };

  const remaining = subData ? daysRemaining(subData.subscription.endDate) : 0;
  const subscriptionHealthColor = remaining > 60 ? '#10B981' : remaining > 14 ? '#F59E0B' : '#EF4444';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="section-header">
        <div className="section-icon" style={{ background: 'linear-gradient(135deg, #F3F4F6, #E5E7EB)' }}>
          <Settings className="w-5 h-5" style={{ color: '#4B5563' }} />
        </div>
        <div>
          <h1 className="section-title">Settings</h1>
          <p className="section-subtitle">Restaurant configuration & subscription</p>
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ backgroundColor: '#F3F4F6', width: 'fit-content' }}>
        {[
          { id: 'general', label: 'General', icon: Settings },
          { id: 'subscription', label: 'Subscription History', icon: Crown },
          { id: 'integrations', label: 'Integrations', icon: Smartphone },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
            style={{
              backgroundColor: activeTab === tab.id ? '#FFFFFF' : 'transparent',
              color: activeTab === tab.id ? '#1A1A1A' : '#6B7280',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── General Settings Tab ────────────────────── */}
      {activeTab === 'general' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="premium-card" style={{ maxWidth: '32rem', padding: '28px' }}>
            <div className="space-y-4">
              {[
                { label: 'Restaurant Name', key: 'name', placeholder: 'Spice Route' },
                { label: 'Address', key: 'address', placeholder: 'MG Road, Jaipur' },
                { label: 'Phone', key: 'phone', placeholder: '+91 98765 43210' },
                { label: 'GSTIN', key: 'gstin', placeholder: '08ABCDE1234F1Z5' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#374151' }}>{label}</label>
                  <input
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="premium-input"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#374151' }}>CGST Rate (%)</label>
                  <input
                    type="number"
                    value={form.cgst_rate}
                    onChange={(e) => setForm({ ...form, cgst_rate: e.target.value })}
                    className="premium-input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#374151' }}>SGST Rate (%)</label>
                  <input
                    type="number"
                    value={form.sgst_rate}
                    onChange={(e) => setForm({ ...form, sgst_rate: e.target.value })}
                    className="premium-input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    step="0.1"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={isLoading}
                className="btn-primary"
                style={{ width: '100%', marginTop: '8px' }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* --- Integrations Tab ---------------------- */}
      {activeTab === 'integrations' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="premium-card" style={{ maxWidth: '40rem', padding: '28px' }}>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-orange-500" />
              Delivery Integrations
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              Connect your POS directly to Swiggy and Zomato APIs to receive online orders instantly in your dashboard.
            </p>

            <div className="space-y-6">
              {/* Swiggy Integration */}
              <div className={`p-6 rounded-2xl border-2 transition-all ${form.swiggy_enabled ? 'border-orange-500 bg-orange-50/30' : 'border-gray-100 bg-white'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-bold text-xl">
                      S
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Swiggy POS API</h4>
                      <p className="text-xs text-gray-500">Direct integration for Swiggy orders</p>
                    </div>
                  </div>
                  
                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={form.swiggy_enabled}
                      onChange={(e) => setForm({ ...form, swiggy_enabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                {form.swiggy_enabled && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 border-t border-orange-100">
                    <label className="text-xs font-medium mb-1.5 block text-gray-700">Swiggy Secret API Key</label>
                    <input
                      type="password"
                      value={form.swiggy_api_key}
                      onChange={(e) => setForm({ ...form, swiggy_api_key: e.target.value })}
                      placeholder="sk_live_swiggy_..."
                      className="premium-input bg-white"
                    />
                    <p className="text-[10px] text-gray-400 mt-2">Webhook URL: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600">https://yourdomain.com/api/webhooks/swiggy</code></p>
                  </motion.div>
                )}
              </div>

              {/* Zomato Integration */}
              <div className={`p-6 rounded-2xl border-2 transition-all ${form.zomato_enabled ? 'border-red-500 bg-red-50/30' : 'border-gray-100 bg-white'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center font-bold text-xl">
                      Z
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Zomato POS API</h4>
                      <p className="text-xs text-gray-500">Direct integration for Zomato orders</p>
                    </div>
                  </div>
                  
                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={form.zomato_enabled}
                      onChange={(e) => setForm({ ...form, zomato_enabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>

                {form.zomato_enabled && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 border-t border-red-100">
                    <label className="text-xs font-medium mb-1.5 block text-gray-700">Zomato POS API Key</label>
                    <input
                      type="password"
                      value={form.zomato_api_key}
                      onChange={(e) => setForm({ ...form, zomato_api_key: e.target.value })}
                      placeholder="zpk_live_..."
                      className="premium-input bg-white"
                    />
                    <p className="text-[10px] text-gray-400 mt-2">Webhook URL: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600">https://yourdomain.com/api/webhooks/zomato</code></p>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button onClick={handleSave} disabled={isLoading} className="btn-primary" style={{ padding: '0 24px', height: '40px' }}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Integrations</>}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Subscription History Tab ────────────────── */}
      {activeTab === 'subscription' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {subLoading && !subData ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
            </div>
          ) : subData ? (
            <>
              {/* ─── Current Plan Hero ──────────────────── */}
              <div
                className="premium-card overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 40%, #FFFFFF 100%)' }}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)' }}
                      >
                        <Crown className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Current Plan</p>
                        <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                          {subData.subscription.currentPlan}
                        </h2>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="badge" style={{
                            backgroundColor: subData.subscription.status === 'ACTIVE' ? '#ECFDF5' : '#FEF2F2',
                            color: subData.subscription.status === 'ACTIVE' ? '#059669' : '#DC2626',
                          }}>
                            <span className="pulse-dot" style={{ width: 6, height: 6, backgroundColor: subData.subscription.status === 'ACTIVE' ? '#10B981' : '#EF4444' }} />
                            {subData.subscription.status}
                          </span>
                          <span className="badge badge-gray">{subData.subscription.currentPlanType}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Renews On</p>
                      <p className="text-sm font-bold text-gray-900">{formatFullDate(subData.subscription.endDate)}</p>
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(100, (remaining / 365) * 100)}%`,
                              backgroundColor: subscriptionHealthColor,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: subscriptionHealthColor, fontFamily: 'var(--font-mono)' }}>
                          {remaining}d left
                        </span>
                      </div>
                      <button
                        onClick={() => setIsRenewModalOpen(true)}
                        className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all duration-300 cursor-pointer bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_16px_rgba(16,185,129,0.4)] hover:-translate-y-0.5"
                      >
                        Renew Subscription
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Stats Cards ───────────────────────── */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  {
                    label: 'Total Spent',
                    value: formatCurrency(subData.stats.totalSpent),
                    icon: IndianRupee,
                    color: '#10B981',
                    cardClass: 'stat-card-emerald',
                  },
                  {
                    label: 'Total GST Paid',
                    value: formatCurrency(subData.stats.totalTax),
                    icon: Receipt,
                    color: '#F97316',
                    cardClass: 'stat-card-orange',
                  },
                  {
                    label: 'Payments Made',
                    value: subData.stats.totalPayments.toString(),
                    icon: CreditCard,
                    color: '#3B82F6',
                    cardClass: 'stat-card-blue',
                  },
                  {
                    label: 'Customer Since',
                    value: `${Math.floor(subData.stats.daysSinceFirst / 365)}y ${Math.floor((subData.stats.daysSinceFirst % 365) / 30)}m`,
                    icon: Shield,
                    color: '#7C3AED',
                    cardClass: 'stat-card-purple',
                  },
                ].map((stat) => (
                  <div key={stat.label} className={`stat-card ${stat.cardClass} p-5`}>
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                      <span className="text-xs text-gray-500">{stat.label}</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* ─── Payment Method Breakdown ──────────── */}
              {subData.stats.paymentMethodBreakdown && Object.keys(subData.stats.paymentMethodBreakdown).length > 0 && (
                <div className="premium-card p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                    Payment Method Breakdown
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    {Object.entries(subData.stats.paymentMethodBreakdown).map(([method, data]) => {
                      const totalOfAll = Object.values(subData.stats.paymentMethodBreakdown).reduce((s, d) => s + d.total, 0);
                      const pct = totalOfAll > 0 ? ((data.total / totalOfAll) * 100).toFixed(0) : '0';
                      return (
                        <div key={method} className="bg-gray-50 rounded-xl p-4 text-center">
                          <span className="text-2xl">{paymentMethodIcon[method] || '💰'}</span>
                          <p className="text-xs font-semibold text-gray-900 mt-2">{method}</p>
                          <p className="text-lg font-bold text-gray-900 mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{pct}%</p>
                          <p className="text-[10px] text-gray-500">{data.count} payment{data.count !== 1 ? 's' : ''} · {formatCurrency(data.total)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Filters ──────────────────────────── */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">Filter by:</span>

                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="premium-select"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                  >
                    <option value="all">All Years</option>
                    {subData.years.map(y => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="premium-select"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                  >
                    <option value="all">All Status</option>
                    <option value="PAID">Paid</option>
                    <option value="PENDING">Pending</option>
                    <option value="FAILED">Failed</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <FileText className="w-3.5 h-3.5" />
                  {subData.history.length} record{subData.history.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* ─── Transaction Timeline Table ────────── */}
              <div className="premium-card overflow-hidden">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>Invoice</th>
                      <th>Date</th>
                      <th>Plan</th>
                      <th>Event</th>
                      <th>Payment</th>
                      <th className="text-right">Amount</th>
                      <th>Status</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {subData.history.length === 0 ? (
                      <tr>
                        <td colSpan={9}>
                          <div className="empty-state">
                            <Receipt className="empty-state-icon" />
                            <p className="empty-state-title">No records found</p>
                            <p className="empty-state-desc">Try adjusting your filters</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      subData.history.map((record, idx) => {
                        const statusCfg = paymentStatusConfig[record.payment_status] || paymentStatusConfig.PAID;
                        const eventCfg = eventTypeConfig[record.event_type] || eventTypeConfig.RENEWAL;
                        const isExpanded = expandedRow === record.id;

                        return (
                          <Fragment key={record.id}>
                            <tr
                              key={record.id}
                              className="cursor-pointer"
                              onClick={() => setExpandedRow(isExpanded ? null : record.id)}
                              style={{ backgroundColor: isExpanded ? '#FAFAF8' : undefined }}
                            >
                              {/* Timeline dot */}
                              <td style={{ position: 'relative', width: '40px' }}>
                                <div className="flex flex-col items-center">
                                  <div
                                    className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                                    style={{
                                      borderColor: eventCfg.color,
                                      backgroundColor: idx === 0 ? eventCfg.color : '#FFFFFF',
                                    }}
                                  />
                                  {idx < subData.history.length - 1 && (
                                    <div className="w-px flex-1" style={{ backgroundColor: '#E5E7EB', minHeight: '28px' }} />
                                  )}
                                </div>
                              </td>

                              {/* Invoice */}
                              <td>
                                <span className="text-xs font-semibold text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>
                                  {record.invoice_number}
                                </span>
                              </td>

                              {/* Date */}
                              <td>
                                <span className="text-sm text-gray-600">{formatDate(record.created_at)}</span>
                              </td>

                              {/* Plan */}
                              <td>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{record.plan_name}</p>
                                  {record.billing_cycle && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">{record.billing_cycle}</p>
                                  )}
                                </div>
                              </td>

                              {/* Event Type */}
                              <td>
                                <span className="badge" style={{ backgroundColor: eventCfg.bg, color: eventCfg.color }}>
                                  <eventCfg.icon className="w-3 h-3" />
                                  {eventCfg.label}
                                </span>
                              </td>

                              {/* Payment Method */}
                              <td>
                                <span className="text-sm text-gray-600">
                                  {paymentMethodIcon[record.payment_method] || '💰'} {record.payment_method}
                                </span>
                              </td>

                              {/* Amount */}
                              <td className="text-right">
                                <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>
                                  {formatCurrency(record.total_amount)}
                                </span>
                              </td>

                              {/* Status */}
                              <td>
                                <span className="badge" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
                                  <statusCfg.icon className="w-3 h-3" />
                                  {statusCfg.label}
                                </span>
                              </td>

                              {/* Expand arrow */}
                              <td>
                                <ChevronRight
                                  className="w-4 h-4 text-gray-400 transition-transform"
                                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                                />
                              </td>
                            </tr>

                            {/* Expanded Row Details */}
                            {isExpanded && (
                              <tr key={`${record.id}-detail`}>
                                <td></td>
                                <td colSpan={8} style={{ paddingTop: 0, paddingBottom: '16px' }}>
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-gray-50 rounded-xl p-4 mt-1"
                                  >
                                    <div className="grid grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <p className="text-xs text-gray-500 mb-0.5">Subtotal</p>
                                        <p className="font-medium" style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(record.amount)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 mb-0.5">GST (18%)</p>
                                        <p className="font-medium" style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(record.tax_amount)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 mb-0.5">Transaction ID</p>
                                        <p className="font-medium" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{record.transaction_id || '—'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 mb-0.5">Period</p>
                                        <p className="font-medium text-xs">{formatDate(record.starts_at)} → {formatDate(record.ends_at)}</p>
                                      </div>
                                    </div>
                                    {record.notes && (
                                      <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                                        📝 {record.notes}
                                      </p>
                                    )}
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); }}
                                        className="btn-primary"
                                        style={{ fontSize: '11px', padding: '6px 14px', borderRadius: '8px' }}
                                      >
                                        <FileText className="w-3 h-3" />
                                        View Invoice
                                      </button>
                                      <button
                                        className="btn-secondary"
                                        style={{ fontSize: '11px', padding: '6px 14px', borderRadius: '8px' }}
                                      >
                                        <Download className="w-3 h-3" />
                                        Download PDF
                                      </button>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>


            </>
          ) : null}
        </motion.div>
      )}

      {/* ─── Modal Portals ────────────────────────────── */}
      <AnimatePresence>
        {selectedRecord && (
          <InvoiceModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRenewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRenewModalOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Renew Subscription</h3>
                  <button
                    onClick={() => setIsRenewModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-6">
                  Select your preferred plan to renew your Spice Route dashboard access. You will be redirected to our secure payment gateway.
                </p>

                <div className="space-y-3 mb-6">
                  {/* Plan Options */}
                  <label 
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === 'annual' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    onClick={() => setSelectedPlan('annual')}
                  >
                    <div className="flex items-center gap-3">
                      <input type="radio" name="plan" checked={selectedPlan === 'annual'} onChange={() => setSelectedPlan('annual')} className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className={`text-sm font-bold ${selectedPlan === 'annual' ? 'text-gray-900' : 'text-gray-700'}`}>Annual Premium</p>
                        <p className="text-xs text-gray-500">Billed yearly (Save 33%)</p>
                      </div>
                    </div>
                    <p className={`font-bold ${selectedPlan === 'annual' ? 'text-emerald-700' : 'text-gray-900'}`}>₹4,499</p>
                  </label>
                  
                  <label 
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === 'quarterly' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    onClick={() => setSelectedPlan('quarterly')}
                  >
                    <div className="flex items-center gap-3">
                      <input type="radio" name="plan" checked={selectedPlan === 'quarterly'} onChange={() => setSelectedPlan('quarterly')} className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className={`text-sm font-bold ${selectedPlan === 'quarterly' ? 'text-gray-900' : 'text-gray-700'}`}>Quarterly Professional</p>
                        <p className="text-xs text-gray-500">Billed every 3 months</p>
                      </div>
                    </div>
                    <p className={`font-bold ${selectedPlan === 'quarterly' ? 'text-emerald-700' : 'text-gray-900'}`}>₹1,299</p>
                  </label>

                  <label 
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === 'monthly' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    onClick={() => setSelectedPlan('monthly')}
                  >
                    <div className="flex items-center gap-3">
                      <input type="radio" name="plan" checked={selectedPlan === 'monthly'} onChange={() => setSelectedPlan('monthly')} className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className={`text-sm font-bold ${selectedPlan === 'monthly' ? 'text-gray-900' : 'text-gray-700'}`}>Monthly Starter</p>
                        <p className="text-xs text-gray-500">Billed monthly</p>
                      </div>
                    </div>
                    <p className={`font-bold ${selectedPlan === 'monthly' ? 'text-emerald-700' : 'text-gray-900'}`}>₹499</p>
                  </label>
                </div>

                <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex items-start gap-2 mb-6">
                  <span className="shrink-0 text-lg">💡</span>
                  <p>When you click proceed, a checkout session is created. On successful payment, your restaurant's access is instantly restored and a new invoice is logged.</p>
                </div>

                <button
                  onClick={handleRenew}
                  disabled={isRenewing}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_16px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:opacity-75 disabled:from-emerald-500 disabled:to-emerald-600"
                >
                  {isRenewing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Proceed to Payment'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
