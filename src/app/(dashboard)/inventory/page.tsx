'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Search, AlertTriangle, Edit2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface RawMaterial {
  id: string;
  name: string;
  unit_type: string;
  current_stock: number;
  low_stock_alert: number;
}

export default function InventoryPage() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', unit_type: 'g', current_stock: 0, low_stock_alert: 10 });
  const [isSaving, setIsSaving] = useState(false);

  // Stock Adjustment Modal
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustData, setAdjustData] = useState({ id: '', action: 'ADD', amount: 0, notes: '' });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (Array.isArray(data)) setMaterials(data);
    } catch {
      toast.error('Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // In this basic version we just support POST for creation.
      // If editing is needed, a PUT to /api/inventory/[id] would be called.
      // But we just do POST for new items.
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success('Material added successfully');
        setIsModalOpen(false);
        fetchMaterials();
      } else {
        toast.error('Failed to save material');
      }
    } catch {
      toast.error('Error saving material');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/inventory/${adjustData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustData)
      });
      if (res.ok) {
        toast.success('Stock adjusted');
        setIsAdjustOpen(false);
        fetchMaterials();
      } else {
        toast.error('Failed to adjust stock');
      }
    } catch {
      toast.error('Error adjusting stock');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Material deleted');
        fetchMaterials();
      }
    } catch {
      toast.error('Error deleting material');
    }
  };

  const filteredMaterials = materials.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  const lowStockItems = materials.filter(m => m.current_stock <= m.low_stock_alert);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="section-header">
        <div className="section-icon" style={{ background: 'linear-gradient(135deg, #F3E8FF, #E9D5FF)' }}>
          <Package className="w-5 h-5" style={{ color: '#9333EA' }} />
        </div>
        <div>
          <h1 className="section-title">Inventory</h1>
          <p className="section-subtitle">Manage raw materials and stock levels</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 premium-card p-4 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search materials..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <button
            onClick={() => {
              setForm({ name: '', unit_type: 'g', current_stock: 0, low_stock_alert: 10 });
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Material
          </button>
        </div>

        <div className="premium-card p-4 border-l-4 border-orange-500 bg-orange-50/50">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-orange-900">Low Stock Alerts</h3>
          </div>
          <p className="text-2xl font-bold text-orange-600 font-mono">{lowStockItems.length}</p>
          <p className="text-xs text-orange-700 mt-1">items need restocking</p>
        </div>
      </div>

      <div className="premium-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Material Name</th>
              <th className="px-5 py-3 font-medium text-right">Current Stock</th>
              <th className="px-5 py-3 font-medium text-right">Low Stock Alert</th>
              <th className="px-5 py-3 font-medium text-center">Status</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : filteredMaterials.map(item => {
              const isLow = item.current_stock <= item.low_stock_alert;
              return (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-gray-700">
                    {item.current_stock} <span className="text-gray-400 text-xs ml-1">{item.unit_type}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-gray-500">
                    {item.low_stock_alert} <span className="text-xs">{item.unit_type}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isLow ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isLow ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setAdjustData({ id: item.id, action: 'ADD', amount: 0, notes: '' });
                          setIsAdjustOpen(true);
                        }}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold transition-colors"
                      >
                        Adjust
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modals for Create and Adjust would go here (omitted for brevity but normally implemented using AnimatePresence similarly) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="font-bold">Add Raw Material</h3>
                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
              </div>
              <form onSubmit={handleSaveMaterial} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                  <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Initial Stock</label>
                    <input required type="number" min="0" value={form.current_stock} onChange={e => setForm({...form, current_stock: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Unit</label>
                    <select value={form.unit_type} onChange={e => setForm({...form, unit_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                      <option value="g">Grams (g)</option>
                      <option value="ml">Milliliters (ml)</option>
                      <option value="unit">Units / Pieces</option>
                      <option value="kg">Kilograms (kg)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Low Stock Alert Level</label>
                  <input required type="number" min="0" value={form.low_stock_alert} onChange={e => setForm({...form, low_stock_alert: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <button type="submit" disabled={isSaving} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Material'}</button>
              </form>
            </motion.div>
          </div>
        )}

        {isAdjustOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="font-bold">Adjust Stock</h3>
                <button onClick={() => setIsAdjustOpen(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
              </div>
              <form onSubmit={handleAdjustStock} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Action</label>
                  <select value={adjustData.action} onChange={e => setAdjustData({...adjustData, action: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                    <option value="ADD">Add Stock (Received from supplier)</option>
                    <option value="DEDUCT">Deduct Stock (Wastage / Manual)</option>
                    <option value="SET">Set Exact Stock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount</label>
                  <input required type="number" min="0.01" step="0.01" value={adjustData.amount || ''} onChange={e => setAdjustData({...adjustData, amount: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (Optional)</label>
                  <input type="text" value={adjustData.notes} onChange={e => setAdjustData({...adjustData, notes: e.target.value})} placeholder="e.g., Wastage due to expiry" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <button type="submit" className="w-full py-2.5 bg-gray-900 hover:bg-black text-white rounded-lg font-semibold">Confirm Adjustment</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
