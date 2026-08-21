'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, DollarSign, ShoppingBag, Award, RefreshCw, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useSession } from 'next-auth/react';

const COLORS = ['#10B981', '#F97316', '#3B82F6'];

export default function ReportsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canDownload = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role);

  const [period, setPeriod] = useState('today');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => { fetchReport(); }, [period]);

  const fetchReport = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setIsLoading(true);
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
      case 'custom':
        from = customDate;
        to = customDate;
        break;
    }

    try {
      const res = await fetch(`/api/reports/sales?from=${from}&to=${to}`, { cache: 'no-store' });
      const data = await res.json();
      setReportData(data);
      setLastUpdated(new Date());
    } catch { } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period, customDate]);

  const handleDownloadReport = () => {
    if (!reportData) return;

    const periodLabel = period === 'custom' ? customDate : period;
    const lines: string[] = [];

    // Header
    lines.push(`Sales Report - ${periodLabel.toUpperCase()}`);
    lines.push(`Generated: ${new Date().toLocaleString('en-IN')}`);
    lines.push('');

    // Summary
    lines.push('=== SUMMARY ===');
    lines.push(`Total Sales,"${(reportData.total_revenue || 0).toLocaleString('en-IN')}"`);
    lines.push(`Total Orders,${reportData.total_orders || 0}`);
    lines.push(`GST Collected,"${(reportData.total_gst || 0).toLocaleString('en-IN')}"`);
    lines.push('');

    // Payment Split
    if (reportData.payment_split) {
      lines.push('=== PAYMENT SPLIT ===');
      lines.push('Mode,Amount');
      lines.push(`Cash,"${(reportData.payment_split.CASH || 0).toLocaleString('en-IN')}"`);
      lines.push(`UPI,"${(reportData.payment_split.UPI || 0).toLocaleString('en-IN')}"`);
      lines.push(`Card,"${(reportData.payment_split.CARD || 0).toLocaleString('en-IN')}"`);
      lines.push('');
    }

    // Top Items
    if (reportData.top_items?.length) {
      lines.push('=== TOP ITEMS ===');
      lines.push('#,Item,Qty Sold,Revenue');
      reportData.top_items.forEach((item: any, i: number) => {
        lines.push(`${i + 1},"${item.name}",${item.quantity},"${(item.revenue || 0).toLocaleString('en-IN')}"`);
      });
      lines.push('');
    }

    // Staff Performance
    if (reportData.staff_performance?.length) {
      lines.push('=== STAFF PERFORMANCE ===');
      lines.push('Name,Role,Tables,Orders,Revenue');
      reportData.staff_performance.forEach((s: any) => {
        lines.push(`"${s.name}",${s.role},${s.tablesHandled},${s.ordersHandled},"${(s.revenue || 0).toLocaleString('en-IN')}"`);
      });
      lines.push('');
    }

    // Hourly / Daily breakdown
    if (period === 'today' && reportData.hourly?.length) {
      lines.push('=== HOURLY BREAKDOWN ===');
      lines.push('Hour,Revenue,Orders');
      reportData.hourly.forEach((h: any) => {
        if (h.revenue > 0 || h.orders > 0) {
          lines.push(`${h.hour},"${h.revenue.toLocaleString('en-IN')}",${h.orders}`);
        }
      });
    } else if (reportData.daily?.length) {
      lines.push('=== DAILY BREAKDOWN ===');
      lines.push('Date,Revenue');
      reportData.daily.forEach((d: any) => {
        lines.push(`${d.date},"${d.revenue.toLocaleString('en-IN')}"`);
      });
    }

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${periodLabel}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            <p className="section-subtitle">
              {lastUpdated
                ? `Last updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                : 'Sales analytics and performance'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canDownload && (
            <button
              onClick={handleDownloadReport}
              disabled={!reportData || isLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
          )}
          <button
            onClick={() => fetchReport(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border cursor-pointer disabled:opacity-60"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
          <div className="flex items-center ml-2 border-l border-gray-200 pl-2">
            <input 
              type="date" 
              value={customDate} 
              onChange={(e) => { setCustomDate(e.target.value); setPeriod('custom'); }} 
              className="px-2 py-1.5 rounded-md text-xs font-medium border border-gray-200 bg-white text-gray-700 outline-none focus:border-indigo-500 cursor-pointer"
            />
          </div>
        </div>
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
              <tr key={`${item.name}-${i}`} style={{ borderBottom: '1px solid #F3F4F6' }}>
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
