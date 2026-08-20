'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Plus, Search, Calendar, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function BillingPage() {
  const [data, setData] = useState<any>({ payments: [], totalCollected: 0, thisMonth: 0 });
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');

  const fetchBilling = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const [billingRes, restaurantsRes] = await Promise.all([
        fetch('/api/super-admin/billing'),
        fetch('/api/super-admin/restaurants'),
      ]);
      const billingData = await billingRes.json();
      const restaurantsData = await restaurantsRes.json();
      setData(billingData);
      setRestaurants(restaurantsData);
    } catch {
      toast.error('Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling(true);
    const interval = setInterval(() => fetchBilling(false), 30000);
    return () => clearInterval(interval);
  }, [fetchBilling]);

  const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());
    
    const res = await fetch('/api/super-admin/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success('Payment recorded');
      setShowAddModal(false);
      fetchBilling();
    } else {
      toast.error('Failed to record payment');
    }
  };

  const filtered = data.payments.filter((p: any) =>
    p.restaurant?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.payment_method?.toLowerCase().includes(search.toLowerCase()) ||
    p.reference_no?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Billing & Payments</h1>
          <p className="text-sm text-gray-500">Track SaaS subscription payments from your tenants.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md cursor-pointer transition-colors">
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><DollarSign className="w-4 h-4" /></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Collected</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">₹{(data.totalCollected || 0).toLocaleString('en-IN')}</h3>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><Calendar className="w-4 h-4" /></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">This Month</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">₹{(data.thisMonth || 0).toLocaleString('en-IN')}</h3>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><CreditCard className="w-4 h-4" /></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Transactions</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{data.payments?.length || 0}</h3>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
          </div>
          <span className="text-xs font-mono text-gray-500 font-medium">{filtered.length} records</span>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : filtered.length > 0 ? (
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50">
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Restaurant</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Method</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Reference</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Notes</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm text-gray-600">{new Date(p.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900">{p.restaurant?.name || '—'}</td>
                  <td className="px-6 py-3 text-sm font-bold text-emerald-700">₹{p.amount.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-100">{p.payment_method}</span></td>
                  <td className="px-6 py-3 text-sm text-gray-500 font-mono">{p.reference_no || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 truncate max-w-[200px]">{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-500 text-sm">No payments recorded yet. Click "Record Payment" to add one.</div>
        )}
      </div>

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
              <p className="text-xs text-gray-500 mt-0.5">Log a SaaS subscription payment from a tenant.</p>
            </div>
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Restaurant</label>
                <select required name="restaurant_id" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm bg-white">
                  <option value="">Select a tenant...</option>
                  {restaurants.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Amount (₹)</label>
                  <input required name="amount" type="number" step="0.01" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" placeholder="5000" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Payment Method</label>
                  <select required name="payment_method" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm bg-white">
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Reference No. (optional)</label>
                <input name="reference_no" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" placeholder="TXN123456" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Notes (optional)</label>
                <input name="notes" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" placeholder="Annual subscription renewal" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition-colors cursor-pointer border border-gray-200">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer shadow-md">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
