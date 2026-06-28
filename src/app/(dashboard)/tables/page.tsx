'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Grid3x3, Users, Clock, MapPin, Combine, Check, X, Unlink, Printer, Eye, RefreshCcw, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TableData {
  id: string;
  table_number: string;
  capacity: number;
  area: 'INDOOR' | 'OUTDOOR' | 'ROOFTOP';
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  activeOrder?: {
    id: string;
    guest_count: number;
    total_amount: number;
    created_at: string;
    item_count: number;
    staff?: { id: string; name: string };
  };
}

const areaFilters = ['All', 'Indoor', 'Outdoor', 'Rooftop'] as const;

export default function TablesPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TableData[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);

  // Merge Mode state
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [selectedTablesForMerge, setSelectedTablesForMerge] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    fetchTables();
    // Subscribe to Supabase Realtime to instantly update tables when an order opens/closes
    const channel = supabase
      .channel('tables_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => {
        fetchTables(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchTables(false);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTables = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch('/api/tables');
      const data = await res.json();
      setTables(data);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const filteredTables = tables.filter((t) => {
    if (activeFilter === 'All') return true;
    return t.area === activeFilter.toUpperCase();
  });

  const totalTables = tables.length;
  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED').length;
  const freeTables = totalTables - occupiedTables;

  const getMinutesSinceCreated = (createdAt: string) => {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  };

  const handleTableClick = (table: TableData) => {
    if (isMergeMode) {
      if (table.status !== 'AVAILABLE') {
        toast.error('Only available tables can be merged');
        return;
      }
      setSelectedTablesForMerge(prev => 
        prev.includes(table.id) ? prev.filter(id => id !== table.id) : [...prev, table.id]
      );
      return;
    }

    if (table.status === 'OCCUPIED' && table.activeOrder) {
      router.push(`/orders/${table.id}`);
    } else {
      router.push(`/orders/${table.id}`);
    }
  };

  const handleConfirmMerge = async () => {
    if (selectedTablesForMerge.length < 2) {
      toast.error('Select at least 2 tables to merge');
      return;
    }
    
    setIsMerging(true);
    try {
      // The first selected table becomes the primary one
      const primary_table_id = selectedTablesForMerge[0];
      const secondary_table_ids = selectedTablesForMerge.slice(1);
      
      const res = await fetch('/api/tables/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_table_id, secondary_table_ids })
      });
      
      if (res.ok) {
        toast.success('Tables merged successfully');
        setIsMergeMode(false);
        setSelectedTablesForMerge([]);
        fetchTables();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to merge tables');
      }
    } catch (error) {
      toast.error('Error merging tables');
    } finally {
      setIsMerging(false);
    }
  };

  const handleDemerge = async (e: React.MouseEvent, primary_table_id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/tables/demerge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_table_id })
      });
      if (res.ok) {
        toast.success('Tables demerged successfully');
        fetchTables();
      } else {
        toast.error('Failed to demerge tables');
      }
    } catch {
      toast.error('Error demerging tables');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="section-header">
        <div className="section-icon" style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' }}>
          <Grid3x3 className="w-5 h-5" style={{ color: '#059669' }} />
        </div>
        <div>
          <h1 className="section-title">Floor Plan</h1>
          <p className="section-subtitle">
            {totalTables} tables · <span style={{ color: '#F97316' }}>{occupiedTables} occupied</span> · <span style={{ color: '#10B981' }}>{freeTables} free</span>
          </p>
        </div>
      </div>

      {/* Filter Tabs & Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {areaFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`filter-pill ${activeFilter === filter ? 'filter-pill-active' : 'filter-pill-inactive'}`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Merge Actions */}
        {isMergeMode ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 mr-2">
              {selectedTablesForMerge.length} selected
            </span>
            <button
              onClick={() => { setIsMergeMode(false); setSelectedTablesForMerge([]); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 flex items-center gap-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={handleConfirmMerge}
              disabled={selectedTablesForMerge.length < 2 || isMerging}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isMerging ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Confirm Merge
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsMergeMode(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 flex items-center gap-1.5 transition-colors border border-blue-200"
          >
            <Combine className="w-3.5 h-3.5" />
            Merge Tables
          </button>
        )}
      </div>

      {/* Tables Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl h-44 animate-pulse"
              style={{ backgroundColor: '#F5F5F3' }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTables.map((table, index) => {
            const isSelected = selectedTablesForMerge.includes(table.id);
            return (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => handleTableClick(table)}
                className={`premium-card premium-card-interactive ${isMergeMode && table.status !== 'AVAILABLE' ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  padding: '20px',
                  borderColor: isSelected ? '#2563EB' : (table.status === 'OCCUPIED' ? '#F9731640' : undefined),
                  backgroundColor: isSelected ? '#EFF6FF' : undefined,
                  borderWidth: isSelected ? '2px' : '1px'
                }}
              >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3
                    className="text-xl font-bold"
                    style={{ fontFamily: 'var(--font-heading)', color: '#1A1A1A' }}
                  >
                    {table.table_number}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                      {table.area.charAt(0) + table.area.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    {table.status === 'OCCUPIED' && <span className="pulse-dot pulse-dot-orange" />}
                    <span
                      className={`badge ${table.status === 'OCCUPIED' ? 'badge-orange' : 'badge-emerald'}`}
                    >
                      {table.status === 'OCCUPIED' ? 'Occupied' : 'Available'}
                    </span>
                  </div>
                  {(table as any).is_merged && !isMergeMode && (
                    <button
                      onClick={(e) => handleDemerge(e, table.id)}
                      className="px-2 py-1 rounded text-[10px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center gap-1 transition-colors"
                    >
                      <Unlink className="w-3 h-3" />
                      Demerge
                    </button>
                  )}
                </div>
              </div>

              {table.status === 'OCCUPIED' && table.activeOrder ? (
                <div className="space-y-2 mt-3" style={{ borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" style={{ color: '#6B7280' }} />
                      <span className="text-xs" style={{ color: '#6B7280' }}>
                        {table.activeOrder.guest_count} guests
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" style={{ color: '#6B7280' }} />
                      <span className="text-xs" style={{ color: '#6B7280' }}>
                        {getMinutesSinceCreated(table.activeOrder.created_at)} min
                      </span>
                    </div>
                  </div>

                  {table.activeOrder.staff && (
                    <div 
                      className="inline-flex items-center gap-1 mt-1 mb-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium w-fit border border-blue-100"
                    >
                      <User className="w-3 h-3" />
                      {table.activeOrder.staff.name}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#6B7280' }}>
                      Running total
                    </span>
                    <span
                      className="text-base font-bold"
                      style={{ fontFamily: 'var(--font-mono)', color: '#F97316' }}
                    >
                      ₹{table.activeOrder.total_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3" style={{ borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                      {table.capacity} seats
                    </span>
                  </div>
                  <p className="text-xs mt-2" style={{ color: '#10B981' }}>
                    {isMergeMode ? (isSelected ? 'Selected' : 'Select to merge') : 'Tap to start new order →'}
                  </p>
                </div>
              )}
            </motion.div>
            );
          })}
        </div>
      )}

      {filteredTables.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <Grid3x3 className="w-12 h-12 mx-auto mb-3" style={{ color: '#D1D5DB' }} />
          <p className="text-sm" style={{ color: '#6B7280' }}>No tables found in this area</p>
        </div>
      )}
    </motion.div>
  );
}
