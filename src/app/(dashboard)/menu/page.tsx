'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { UtensilsCrossed, Plus, Pencil, Trash2, History, ChevronDown, ChevronUp, Lock, X, Loader2 } from 'lucide-react';

export default function MenuPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const isStaff = session?.user?.role === 'WAITER' || session?.user?.role === 'CASHIER';

  if (!isAdmin && !isStaff) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#7C3AED20' }}>
          <Lock className="w-8 h-8" style={{ color: '#7C3AED' }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: '#1A1A1A' }}>
          Access Denied
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>Please log in to access this page.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="section-header">
        <div className="section-icon" style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' }}>
          <UtensilsCrossed className="w-5 h-5" style={{ color: '#059669' }} />
        </div>
        <div>
          <h1 className="section-title">Menu Management</h1>
          <p className="section-subtitle">Manage categories, items, and pricing</p>
        </div>
      </div>
      <MenuManagement isAdmin={isAdmin} />
    </motion.div>
  );
}

function MenuManagement({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [priceLogs, setPriceLogs] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newPrice, setNewPrice] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchMenu(); }, []);

  const fetchMenu = async () => {
    try {
      const res = await fetch('/api/menu');
      const data = await res.json();
      setCategories(data);
      setItems(data.flatMap((c: any) => c.items));
    } catch { } finally { setIsLoading(false); }
  };

  const handlePriceUpdate = async () => {
    if (!editingItem || !newPrice) return;
    try {
      const res = await fetch(`/api/menu/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseFloat(newPrice) }),
      });
      if (res.ok) {
        toast.success(`Price updated from ₹${editingItem.price} to ₹${newPrice}`);
        setEditingItem(null);
        setNewPrice('');
        fetchMenu();
      }
    } catch { toast.error('Failed to update price'); }
  };

  const handleToggleAvailability = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/menu/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !current }),
      });
      fetchMenu();
    } catch { toast.error('Failed to toggle'); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the menu? It will no longer appear during billing.`)) return;
    try {
      await fetch(`/api/menu/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_deleted: true }),
      });
      toast.success(`${name} removed from menu`);
      fetchMenu();
    } catch { toast.error('Failed to remove'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold" style={{ color: '#1A1A1A' }}>Menu Items</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> Add New Item
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveCategory('all')}
          className={`filter-pill ${activeCategory === 'all' ? 'filter-pill-active' : 'filter-pill-inactive'}`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`filter-pill ${activeCategory === cat.id ? 'filter-pill-active' : 'filter-pill-inactive'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="premium-card" style={{ overflow: 'hidden' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#FAFAF8', borderBottom: '1px solid #E5E7EB' }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: '#6B7280' }}>Item</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: '#6B7280' }}>Category</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: '#6B7280' }}>Type</th>
              <th className="text-right px-4 py-3 font-medium" style={{ color: '#6B7280' }}>Price</th>
              <th className="text-center px-4 py-3 font-medium" style={{ color: '#6B7280' }}>Available</th>
              {isAdmin && <th className="text-right px-4 py-3 font-medium" style={{ color: '#6B7280' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {(activeCategory === 'all' ? categories : categories.filter(c => c.id === activeCategory)).map(category => (
              <React.Fragment key={category.id}>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', borderTop: '1px solid #E5E7EB' }}>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-2 font-bold text-sm" style={{ color: '#10B981' }}>
                    {category.name}
                  </td>
                </tr>
                {category.items.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-4 py-3 text-center text-xs" style={{ color: '#9CA3AF' }}>
                      No items in this category.
                    </td>
                  </tr>
                ) : (
                  category.items.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={item.food_type === 'VEG' ? 'veg-dot' : 'non-veg-dot'} />
                          <span className="font-medium" style={{ color: '#1A1A1A' }}>{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: '#10B98115', color: '#10B981' }}>
                          {item.category?.name || category.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#6B7280' }}>{item.food_type}</td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ fontFamily: 'var(--font-mono)', color: '#1A1A1A' }}>₹{item.price}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleAvailability(item.id, item.is_available)}
                          className="w-10 h-5 rounded-full relative transition-all cursor-pointer"
                          style={{ backgroundColor: item.is_available ? '#10B981' : '#D1D5DB' }}
                        >
                          <span
                            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm"
                            style={{ left: item.is_available ? '22px' : '2px' }}
                          />
                        </button>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditingItem(item); setNewPrice(item.price.toString()); }}
                              className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[#F5F5F3]"
                              style={{ color: '#6B7280' }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[#FEF2F2]"
                              style={{ color: '#EF4444' }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Price History */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="flex items-center gap-2 mt-6 mb-2 text-sm font-medium cursor-pointer"
        style={{ color: '#6B7280' }}
      >
        <History className="w-4 h-4" />
        Price Change History
        {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showHistory && <PriceHistory />}

      {/* Edit Price Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-xl p-6" style={{ backgroundColor: '#FFFFFF' }}>
            <h3 className="text-base font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Edit Price</h3>
            <p className="text-sm mb-1" style={{ color: '#1A1A1A' }}>{editingItem.name}</p>
            <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Current: ₹{editingItem.price}</p>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6B7280' }}>₹</span>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-lg text-sm outline-none"
                style={{ border: '1px solid #E5E7EB', fontFamily: 'var(--font-mono)' }}
                min="1"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingItem(null)} className="flex-1 py-2 rounded-lg text-sm cursor-pointer" style={{ backgroundColor: '#F5F5F3', color: '#6B7280' }}>Cancel</button>
              <button onClick={handlePriceUpdate} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ backgroundColor: '#10B981' }}>Update Price</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && <AddItemModal categories={categories} onClose={() => setShowAddModal(false)} onAdded={fetchMenu} />}
    </div>
  );
}

function PriceHistory() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/menu/price-logs').then(r => r.json()).then(setLogs).catch(() => {});
  }, []);

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ backgroundColor: '#FAFAF8', borderBottom: '1px solid #E5E7EB' }}>
            <th className="text-left px-4 py-2 font-medium" style={{ color: '#6B7280' }}>Item</th>
            <th className="text-right px-4 py-2 font-medium" style={{ color: '#6B7280' }}>Old Price</th>
            <th className="text-right px-4 py-2 font-medium" style={{ color: '#6B7280' }}>New Price</th>
            <th className="text-left px-4 py-2 font-medium" style={{ color: '#6B7280' }}>Changed By</th>
            <th className="text-left px-4 py-2 font-medium" style={{ color: '#6B7280' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log: any) => (
            <tr key={log.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
              <td className="px-4 py-2">{log.menu_item?.name || 'Unknown'}</td>
              <td className="px-4 py-2 text-right" style={{ fontFamily: 'var(--font-mono)' }}>₹{log.old_price}</td>
              <td className="px-4 py-2 text-right" style={{ fontFamily: 'var(--font-mono)' }}>₹{log.new_price}</td>
              <td className="px-4 py-2">{log.changed_by}</td>
              <td className="px-4 py-2" style={{ color: '#9CA3AF' }}>{new Date(log.changed_at).toLocaleDateString('en-IN')}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-6 text-center" style={{ color: '#9CA3AF' }}>No price changes yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AddItemModal({ categories, onClose, onAdded }: { categories: any[]; onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [foodType, setFoodType] = useState('VEG');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name || !categoryId || !price) { toast.error('Fill required fields'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category_id: categoryId, food_type: foodType, price: parseFloat(price), description }),
      });
      if (res.ok) {
        toast.success(`${name} added to menu`);
        onAdded();
        onClose();
      }
    } catch { toast.error('Failed to add item'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-xl p-6" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Add New Item</h3>
          <button onClick={onClose} className="cursor-pointer"><X className="w-4 h-4" style={{ color: '#6B7280' }} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#6B7280' }}>Item Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ border: '1px solid #E5E7EB' }} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#6B7280' }}>Category *</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ border: '1px solid #E5E7EB' }}>
              <option value="">Select category</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#6B7280' }}>Food Type</label>
            <div className="flex gap-2">
              {['VEG', 'NON_VEG'].map(t => (
                <button key={t} onClick={() => setFoodType(t)} className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer" style={{ backgroundColor: foodType === t ? (t === 'VEG' ? '#ECFDF5' : '#FEF2F2') : '#F5F5F3', color: foodType === t ? (t === 'VEG' ? '#16A34A' : '#DC2626') : '#6B7280', border: `1px solid ${foodType === t ? (t === 'VEG' ? '#A7F3D0' : '#FECACA') : '#E5E7EB'}` }}>
                  <span className={t === 'VEG' ? 'veg-dot' : 'non-veg-dot'} style={{ marginRight: '4px' }} />{t === 'VEG' ? 'Veg' : 'Non-Veg'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#6B7280' }}>Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6B7280' }}>₹</span>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full pl-8 pr-4 py-2 rounded-lg text-sm outline-none" style={{ border: '1px solid #E5E7EB', fontFamily: 'var(--font-mono)' }} min="1" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#6B7280' }}>Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg text-sm resize-none outline-none" style={{ border: '1px solid #E5E7EB' }} />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm cursor-pointer" style={{ backgroundColor: '#F5F5F3', color: '#6B7280' }}>Cancel</button>
            <button onClick={handleSave} disabled={isLoading} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer flex items-center justify-center gap-2" style={{ backgroundColor: '#10B981' }}>
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
