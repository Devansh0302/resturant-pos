'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, User, Clock, Search, ChevronRight } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

export default function StaffPerformancePage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [data, setData] = useState<any>(null);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    fetch('/api/staff')
      .then(r => r.json())
      .then(d => {
        setStaffList(d);
        if (d.length > 0) {
          const defaultStaff = d.find((s: any) => s.role === 'WAITER') || d[0];
          setSelectedStaff(defaultStaff);
        }
        setLoadingStaff(false);
      })
      .catch(() => setLoadingStaff(false));
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      setLoadingData(true);
      fetch(`/api/staff/${selectedStaff.id}/history`)
        .then(r => r.json())
        .then(d => {
          setData(d);
          setLoadingData(false);
        })
        .catch(() => setLoadingData(false));
    }
  }, [selectedStaff]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="section-header">
        <div className="section-icon" style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
          <TrendingUp className="w-5 h-5" style={{ color: '#2563EB' }} />
        </div>
        <div>
          <h1 className="section-title">Staff Performance</h1>
          <p className="section-subtitle">Track waiter orders and revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Staff Selector */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-sm font-semibold text-gray-900">Select Staff</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {loadingStaff ? (
                <div className="p-4 text-center text-sm text-gray-500">Loading staff...</div>
              ) : (
                staffList.map(staff => (
                  <button
                    key={staff.id}
                    onClick={() => setSelectedStaff(staff)}
                    className={`w-full flex items-center justify-between p-4 transition-colors ${selectedStaff?.id === staff.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedStaff?.id === staff.id ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        <User className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-medium ${selectedStaff?.id === staff.id ? 'text-blue-900' : 'text-gray-900'}`}>{staff.name}</p>
                        <p className={`text-xs ${selectedStaff?.id === staff.id ? 'text-blue-600' : 'text-gray-500'}`}>{staff.role}</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${selectedStaff?.id === staff.id ? 'text-blue-500' : 'text-gray-300'}`} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Performance Data */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
            {loadingData ? (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : data && !data.error ? (
              <div className="space-y-8">
                {/* Header Stats */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>{selectedStaff?.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">Performance Overview</p>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100/50">
                    <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Today's Activity
                    </h3>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm text-blue-600/80 mb-1">Orders Handled</p>
                        <p className="text-3xl font-bold text-blue-900">{data.today.ordersCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-blue-600/80 mb-1">Revenue Generated</p>
                        <p className="text-3xl font-bold text-blue-900" style={{ fontFamily: 'var(--font-mono)' }}>₹{data.today.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> All Time History
                    </h3>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                        <p className="text-3xl font-bold text-gray-900">{data.history.ordersCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                        <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>₹{data.history.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Orders Table */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Recent Orders</h3>
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 font-semibold text-gray-600">Invoice</th>
                          <th className="px-6 py-4 font-semibold text-gray-600">Table</th>
                          <th className="px-6 py-4 font-semibold text-gray-600">Date & Time</th>
                          <th className="px-6 py-4 font-semibold text-gray-600 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.recentOrders.length === 0 ? (
                          <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No orders found for this staff member.</td></tr>
                        ) : (
                          data.recentOrders.map((order: any) => (
                            <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>{order.invoice_number}</td>
                              <td className="px-6 py-4 text-gray-600">{order.table_number}</td>
                              <td className="px-6 py-4 text-gray-500">{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                              <td className="px-6 py-4 text-right font-bold text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>₹{order.total_amount.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500">
                <Search className="w-8 h-8 mb-3 text-gray-300" />
                <p>Select a staff member to view their performance</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
