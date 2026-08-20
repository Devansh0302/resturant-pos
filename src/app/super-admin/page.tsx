'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, Users, CreditCard, Activity, DollarSign, TrendingUp, AlertTriangle, Calendar, Building2, RefreshCw, Trophy } from 'lucide-react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SuperAdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/stats');
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch { } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(true);
    const interval = setInterval(() => fetchStats(false), 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Overview</h1>
          <p className="text-sm text-gray-500">Welcome back. Here is what's happening on your platform today.</p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Building2 className="w-16 h-16 text-indigo-600" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Tenants</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900">{isLoading ? '—' : stats?.totalTenants}</h3>
            <span className="text-sm font-medium text-emerald-600">{isLoading ? '' : `${stats?.activeTenants} active`}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign className="w-16 h-16 text-emerald-600" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Order Revenue</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900">{isLoading ? '—' : formatCurrency(stats?.totalRevenue || 0)}</h3>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-16 h-16 text-blue-600" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Orders</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900">{isLoading ? '—' : stats?.totalOrders?.toLocaleString()}</h3>
            <span className="text-sm font-medium text-gray-500">paid</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle className="w-16 h-16 text-amber-600" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiring Soon</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900">{isLoading ? '—' : stats?.expiringSoon?.length || 0}</h3>
            <span className="text-xs font-medium text-amber-600">within 30 days</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col h-96">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Platform Revenue (Last 7 Days)</h2>
          </div>
          <div className="flex-1 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
            ) : stats?.chartData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No revenue data available</div>
            )}
          </div>
        </div>

        {/* Top Tenants Leaderboard */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col h-96">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">Top Tenants</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {isLoading ? (
               <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>
            ) : stats?.topTenants?.length > 0 ? (
              stats.topTenants.map((t: any, index: number) => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    index === 0 ? 'bg-amber-100 text-amber-700' : 
                    index === 1 ? 'bg-gray-100 text-gray-600' : 
                    index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{t.name}</p>
                    <p className="text-xs text-gray-500 truncate">{t.orders} orders</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-emerald-600">₹{(t.revenue/1000).toFixed(1)}k</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500 text-sm">No top tenants yet.</div>
            )}
          </div>
        </div>

        {/* Expiring Tenants */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Expiring Subscriptions</h2>
              <p className="text-xs text-gray-500 mt-1">Tenants whose subscriptions expire within 30 days</p>
            </div>
            <Link href="/super-admin/restaurants" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View All Tenants →</Link>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>
          ) : stats?.expiringSoon?.length > 0 ? (
            <div className="space-y-3">
              {stats.expiringSoon.map((r: any) => {
                const daysLeft = Math.ceil((new Date(r.subscription_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <Link key={r.id} href={`/super-admin/restaurants/${r.id}`} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold">{r.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                        daysLeft <= 7 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        <Calendar className="w-3 h-3" />
                        {daysLeft} days left
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 text-sm">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              No subscriptions expiring soon. All tenants are healthy.
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <Link href="/super-admin/logs" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View All</Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>
          ) : stats?.recentLogs?.length > 0 ? (
            <div className="flex-1 space-y-5">
              {stats.recentLogs.slice(0, 6).map((log: any) => {
                const colorMap: Record<string, { color: string; bg: string }> = {
                  'TENANT_PROVISIONED': { color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  'TENANT_UPDATED': { color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  'TENANT_DELETED': { color: 'text-rose-600', bg: 'bg-rose-50' },
                  'PAYMENT_RECORDED': { color: 'text-blue-600', bg: 'bg-blue-50' },
                  'SETTINGS_UPDATED': { color: 'text-gray-600', bg: 'bg-gray-100' },
                };
                const c = colorMap[log.action] || { color: 'text-gray-600', bg: 'bg-gray-100' };
                return (
                  <div key={log.id} className="flex gap-3">
                    <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${c.bg} ${c.color}`}>
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{log.action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{log.description}</p>
                      <span className="text-[10px] text-gray-400 font-mono mt-1 block">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 text-sm">
              No activity logs yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
