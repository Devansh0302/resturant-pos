'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ShoppingBag, Users, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/reports/daily').then(r => r.json()),
      fetch('/api/reports/sales').then(r => r.json()),
      fetch('/api/bills?limit=10').then(r => r.json()),
    ]).then(([daily, sales, bills]) => {
      setStats(daily);
      setHourlyData(sales.hourly || []);
      setRecentOrders(Array.isArray(bills) ? bills.slice(0, 10) : []);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const statCards = [
    {
      label: "Today's Sales",
      value: `₹${(stats?.today_revenue || 0).toLocaleString('en-IN')}`,
      change: stats?.revenue_change || '0',
      icon: DollarSign,
      color: '#10B981',
    },
    {
      label: 'Orders Today',
      value: stats?.orders_today || 0,
      icon: ShoppingBag,
      color: '#F97316',
    },
    {
      label: 'Active Tables',
      value: `${stats?.active_tables || 0}/${stats?.total_tables || 12}`,
      icon: Users,
      color: '#3B82F6',
    },
    {
      label: 'Avg Order Value',
      value: `₹${Math.round(stats?.avg_order_value || 0).toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: '#10B981',
    },
    {
      label: 'GST Collected',
      value: `₹${(stats?.total_gst || 0).toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: '#8B5CF6',
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="section-header">
        <div className="section-icon" style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' }}>
          <TrendingUp className="w-5 h-5" style={{ color: '#059669' }} />
        </div>
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">Today&apos;s overview and analytics</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`stat-card ${['stat-card-emerald','stat-card-orange','stat-card-blue','stat-card-emerald', 'stat-card-blue'][index]} p-5`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: '#6B7280' }}>{card.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                <card.icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: '#1A1A1A' }}>
              {card.value}
            </p>
            {card.change && (
              <div className="flex items-center gap-1 mt-1">
                {parseFloat(card.change) >= 0 ? (
                  <TrendingUp className="w-3 h-3" style={{ color: '#16A34A' }} />
                ) : (
                  <TrendingDown className="w-3 h-3" style={{ color: '#EF4444' }} />
                )}
                <span className="text-[11px] font-medium" style={{ color: parseFloat(card.change) >= 0 ? '#16A34A' : '#EF4444' }}>
                  {card.change}% vs yesterday
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Hourly Sales Chart */}
      <div className="premium-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <h2 className="text-base font-bold mb-4" style={{ fontFamily: 'var(--font-heading)', color: '#1A1A1A' }}>
          Hourly Sales
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} tickFormatter={(v) => `₹${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value: any) => [`₹${value}`, 'Sales']}
            />
            <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Orders */}
      <div className="premium-card" style={{ overflow: 'hidden' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#1A1A1A' }}>Recent Orders</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: '#6B7280' }}>Invoice</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: '#6B7280' }}>Table</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium" style={{ color: '#6B7280' }}>Items</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium" style={{ color: '#6B7280' }}>Amount</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: '#6B7280' }}>Payment</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: '#6B7280' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map(order => (
              <tr key={order.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td className="px-4 py-2.5 font-medium" style={{ fontFamily: 'var(--font-mono)', color: '#1A1A1A', fontSize: '12px' }}>{order.invoice_number}</td>
                <td className="px-4 py-2.5" style={{ color: '#6B7280' }}>{order.table_number}</td>
                <td className="px-4 py-2.5 text-right" style={{ fontFamily: 'var(--font-mono)' }}>{order.items_count}</td>
                <td className="px-4 py-2.5 text-right font-semibold" style={{ fontFamily: 'var(--font-mono)', color: '#1A1A1A' }}>₹{order.total?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: '#F5F5F3', color: '#6B7280' }}>
                    {order.payment_mode || '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{
                    backgroundColor: order.status === 'PAID' ? '#ECFDF5' : '#FEF3C7',
                    color: order.status === 'PAID' ? '#16A34A' : '#B8792E',
                  }}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
            {recentOrders.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: '#9CA3AF' }}>No orders yet today</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
