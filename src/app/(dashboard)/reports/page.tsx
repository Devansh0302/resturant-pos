'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, DollarSign, ShoppingBag, Award } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#10B981', '#F97316', '#3B82F6'];

export default function ReportsPage() {
  const [period, setPeriod] = useState('today');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchReport(); }, [period]);

  const fetchReport = async () => {
    setIsLoading(true);
    const now = new Date();
    let from = '', to = now.toISOString().split('T')[0];

    switch (period) {
      case 'today':
        from = to;
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        from = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        from = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
        break;
    }

    try {
      const res = await fetch(`/api/reports/sales?from=${from}&to=${to}`);
      const data = await res.json();
      setReportData(data);
    } catch { } finally { setIsLoading(false); }
  };

  const paymentData = reportData?.payment_split
    ? [
        { name: 'Cash', value: reportData.payment_split.CASH },
        { name: 'UPI', value: reportData.payment_split.UPI },
        { name: 'Card', value: reportData.payment_split.CARD },
      ].filter(d => d.value > 0)
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center justify-between mb-6">
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div className="section-icon" style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
            <TrendingUp className="w-5 h-5" style={{ color: '#2563EB' }} />
          </div>
          <div>
            <h1 className="section-title">Reports</h1>
            <p className="section-subtitle">Sales analytics and performance</p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer"
              style={{
                backgroundColor: period === p.id ? '#FFFFFF' : 'transparent',
                color: period === p.id ? '#1A1A1A' : '#6B7280',
                boxShadow: period === p.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Sales', value: `₹${(reportData?.total_revenue || 0).toLocaleString('en-IN')}`, icon: DollarSign, color: '#10B981' },
          { label: 'Total Orders', value: reportData?.total_orders || 0, icon: ShoppingBag, color: '#F97316' },
          { label: 'GST Collected', value: `₹${(reportData?.total_gst || 0).toLocaleString('en-IN')}`, icon: TrendingUp, color: '#3B82F6' },
          { label: 'Top Item', value: reportData?.top_items?.[0]?.name || '—', icon: Award, color: '#10B981' },
        ].map((card, i) => (
          <div key={card.label} className={`stat-card ${['stat-card-emerald','stat-card-orange','stat-card-blue','stat-card-emerald'][i]} p-5`}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="w-4 h-4" style={{ color: card.color }} />
              <span className="text-xs" style={{ color: '#6B7280' }}>{card.label}</span>
            </div>
            <p className="text-xl font-bold truncate" style={{ fontFamily: card.label.includes('Item') ? 'var(--font-sans)' : 'var(--font-mono)', color: '#1A1A1A' }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Sales Chart */}
        <div className="col-span-2 premium-card" style={{ padding: '24px' }}>
          <h2 className="text-base font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            {period === 'today' ? 'Hourly Sales' : 'Daily Sales'}
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={period === 'today' ? reportData?.hourly : reportData?.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey={period === 'today' ? 'hour' : 'date'} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(v) => `₹${v}`} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }} formatter={(v: any) => [`₹${v}`, 'Sales']} />
              <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Split */}
        <div className="premium-card" style={{ padding: '24px' }}>
          <h2 className="text-base font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Payment Split</h2>
          {paymentData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => `₹${v}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {paymentData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <span style={{ color: '#6B7280' }}>{d.name}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#1A1A1A' }}>₹{d.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-sm py-12" style={{ color: '#9CA3AF' }}>No data yet</p>
          )}
        </div>
      </div>

      {/* Top Items */}
      <div className="premium-card" style={{ overflow: 'hidden' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Top 10 Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: '#6B7280' }}>#</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: '#6B7280' }}>Item</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium" style={{ color: '#6B7280' }}>Qty Sold</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium" style={{ color: '#6B7280' }}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {(reportData?.top_items || []).map((item: any, i: number) => (
              <tr key={item.name} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td className="px-4 py-2.5 text-xs" style={{ color: '#9CA3AF' }}>{i + 1}</td>
                <td className="px-4 py-2.5 font-medium" style={{ color: '#1A1A1A' }}>{item.name}</td>
                <td className="px-4 py-2.5 text-right" style={{ fontFamily: 'var(--font-mono)' }}>{item.quantity}</td>
                <td className="px-4 py-2.5 text-right font-semibold" style={{ fontFamily: 'var(--font-mono)', color: '#1A1A1A' }}>₹{item.revenue?.toLocaleString('en-IN')}</td>
              </tr>
            ))}
            {(!reportData?.top_items || reportData.top_items.length === 0) && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: '#9CA3AF' }}>No sales data for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
