'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Calendar, Receipt } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';

export default function BillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchBills(); }, []);

  const fetchBills = async (query = search, date = dateFilter) => {
    try {
      let url = `/api/bills?search=${query}`;
      if (date) url += `&from=${date}&to=${date}`;
      const res = await fetch(url);
      const data = await res.json();
      setBills(Array.isArray(data) ? data : []);
    } catch { } finally { setIsLoading(false); }
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    fetchBills(val, dateFilter);
  };

  const handleDateChange = (val: string) => {
    setDateFilter(val);
    fetchBills(search, val);
  };

  const handleExportCSV = () => {
    const headers = ['Invoice,Table,Date,Items,Subtotal,GST,Total,Payment,Staff'];
    const rows = bills.map(b =>
      `${b.invoice_number},${b.table_number},${new Date(b.date).toLocaleDateString('en-IN')},${b.items_count},${b.subtotal},${b.gst},${b.total},${b.payment_mode || ''},${b.staff_name}`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spice-route-bills-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center justify-between mb-6">
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div className="section-icon" style={{ background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)' }}>
            <Receipt className="w-5 h-5" style={{ color: '#EA580C' }} />
          </div>
          <div>
            <h1 className="section-title">Bills</h1>
            <p className="section-subtitle">{bills.length} bills found</p>
          </div>
        </div>
        <button
          onClick={handleExportCSV}
          className="btn-secondary"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search by invoice number..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="premium-input"
            style={{ paddingLeft: '40px' }}
          />
        </div>
        <div className="w-56 z-10">
          <DatePicker value={dateFilter} onChange={handleDateChange} placeholder="Filter by date..." />
        </div>
        {dateFilter && (
          <button
            onClick={() => handleDateChange('')}
            className="text-xs text-red-500 hover:underline cursor-pointer font-medium"
          >
            Clear Date
          </button>
        )}
      </div>

      {/* Bills Table */}
      <div className="premium-card" style={{ overflow: 'hidden' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>Invoice</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>Table</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>Date</th>
              <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>Items</th>
              <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>Subtotal</th>
              <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>GST</th>
              <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>Total</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>Payment</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#6B7280' }}>Staff</th>
            </tr>
          </thead>
          <tbody>
            {bills.map(bill => (
              <tr key={bill.id} style={{ borderBottom: '1px solid #F3F4F6' }} className="hover:bg-[#F9FAFB] transition-colors">
                <td className="px-4 py-3 font-medium" style={{ fontFamily: 'var(--font-mono)', color: '#1A1A1A', fontSize: '12px' }}>{bill.invoice_number}</td>
                <td className="px-4 py-3" style={{ color: '#6B7280' }}>{bill.table_number}</td>
                <td className="px-4 py-3 text-xs" style={{ color: '#6B7280' }}>
                  {new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-right" style={{ fontFamily: 'var(--font-mono)' }}>{bill.items_count}</td>
                <td className="px-4 py-3 text-right" style={{ fontFamily: 'var(--font-mono)' }}>₹{bill.subtotal?.toFixed(2)}</td>
                <td className="px-4 py-3 text-right" style={{ fontFamily: 'var(--font-mono)', color: '#9CA3AF' }}>₹{bill.gst?.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-semibold" style={{ fontFamily: 'var(--font-mono)', color: '#1A1A1A' }}>₹{bill.total?.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: '#F5F5F3', color: '#6B7280' }}>
                    {bill.payment_mode || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: '#6B7280' }}>{bill.staff_name}</td>
              </tr>
            ))}
            {bills.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <Receipt className="w-10 h-10 mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                  <p className="text-sm" style={{ color: '#6B7280' }}>No bills found</p>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Bills will appear here after orders are paid</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
