'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { UtensilsCrossed, Plus, Pencil, Trash2, History, ChevronDown, ChevronUp, Lock, X, Loader2, BookOpen, FolderPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function MenuPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const restaurantId = (session?.user as any)?.restaurantId;
  const isYangkiez = restaurantId === 'cmt1yrr3b0000l504jzjmwajb';

  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isManager = role === 'MANAGER';
  const isStaff = role === 'WAITER' || role === 'CASHIER';

  const hasAccess = isAdmin || isStaff || (isManager && isYangkiez);
  const canEdit = isAdmin || (isManager && isYangkiez);

  if (!hasAccess) {
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
      <MenuManagement canEdit={canEdit} />
    </motion.div>
  );
}

function MenuManagement({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [priceLogs, setPriceLogs] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newPrice, setNewPrice] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recipeItem, setRecipeItem] = useState<any>(null);

  useEffect(() => {
    fetchMenu();

    const channel = supabase
      .channel('menu_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        (payload) => {
          fetchMenu(); // Re-fetch menu on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMenu = async () => {
    try {
      const res = await fetch(`/api/menu?t=${Date.now()}`, { cache: 'no-store' });
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
        body: JSON.stringify({
          price: parseFloat(newPrice),
          variants: editingItem.variants?.map((v: any) => ({ name: v.name, price: parseFloat(v.price) })) || null
        }),
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
    // Optimistic update
    setCategories(prev => prev.map(c => ({
      ...c,
      items: c.items.map((i: any) => i.id === id ? { ...i, is_available: !current } : i)
    })));

    try {
      const res = await fetch(`/api/menu/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !current }),
      });
      if (!res.ok) {
        // Revert on error
        setCategories(prev => prev.map(c => ({
          ...c,
          items: c.items.map((i: any) => i.id === id ? { ...i, is_available: current } : i)
        })));
        const err = await res.json();
        toast.error(err.error || 'Failed to toggle availability');
        return;
      }
    } catch { 
      // Revert on error
      setCategories(prev => prev.map(c => ({
        ...c,
        items: c.items.map((i: any) => i.id === id ? { ...i, is_available: current } : i)
      })));
      toast.error('Network error. Failed to toggle'); 
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the menu? It will no longer appear during billing.`)) return;
    try {
      const res = await fetch(`/api/menu/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_deleted: true }),
      });
      if (res.ok) {
        toast.success(`${name} removed from menu`);
        fetchMenu();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to remove item');
      }
    } catch { toast.error('Failed to remove'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold" style={{ color: '#1A1A1A' }}>Menu Items</h2>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddCategoryModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" /> Add Categories
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Add New Item
            </button>
          </div>
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
              {canEdit && <th className="text-right px-4 py-3 font-medium" style={{ color: '#6B7280' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {(activeCategory === 'all' ? categories : categories.filter(c => c.id === activeCategory)).map(category => (
              <React.Fragment key={category.id}>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', borderTop: '1px solid #E5E7EB' }}>
                  <td colSpan={canEdit ? 6 : 5} className="px-4 py-2 font-bold text-sm" style={{ color: '#10B981' }}>
                    {category.name}
                  </td>
                </tr>
                {category.items.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="px-4 py-3 text-center text-xs" style={{ color: '#9CA3AF' }}>
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
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setRecipeItem(item)}
                              className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[#F5F5F3]"
                              style={{ color: '#8B5CF6' }}
                              title="Manage Recipe"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>
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
            <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Current Base: ₹{editingItem.price}</p>
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

            <div className="mb-2 mt-4 flex items-center justify-between">
              <label className="text-xs font-bold block" style={{ color: '#1A1A1A' }}>Variants</label>
              <button 
                type="button" 
                onClick={() => {
                  const currVariants = editingItem.variants || [];
                  setEditingItem({ ...editingItem, variants: [...currVariants, { name: '', price: '' }] });
                }}
                className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded cursor-pointer"
              >
                + Add Variant
              </button>
            </div>
            
            {editingItem.variants && editingItem.variants.length > 0 && (
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1">
                {editingItem.variants.map((variant: any, index: number) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      placeholder="Name"
                      value={variant.name}
                      onChange={(e) => {
                        const newV = [...editingItem.variants];
                        newV[index].name = e.target.value;
                        setEditingItem({ ...editingItem, variants: newV });
                      }}
                      className="flex-1 px-3 py-2 rounded text-sm outline-none border border-gray-200"
                    />
                    <input
                      placeholder="₹ Price"
                      type="number"
                      value={variant.price}
                      onChange={(e) => {
                        const newV = [...editingItem.variants];
                        newV[index].price = e.target.value;
                        setEditingItem({ ...editingItem, variants: newV });
                      }}
                      className="w-24 px-3 py-2 rounded text-sm outline-none border border-gray-200 font-mono"
                    />
                    <button 
                      onClick={() => {
                        const newV = editingItem.variants.filter((_: any, i: number) => i !== index);
                        setEditingItem({ ...editingItem, variants: newV.length > 0 ? newV : null });
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setEditingItem(null)} className="flex-1 py-2 rounded-lg text-sm cursor-pointer" style={{ backgroundColor: '#F5F5F3', color: '#6B7280' }}>Cancel</button>
              <button onClick={handlePriceUpdate} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ backgroundColor: '#10B981' }}>Update Price</button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {recipeItem && <RecipeModal item={recipeItem} onClose={() => setRecipeItem(null)} />}

      {/* Add Categories Modal */}
      {showAddCategoryModal && <AddBulkCategoryModal onClose={() => setShowAddCategoryModal(false)} onAdded={fetchMenu} />}

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

function AddItemModal({ categories: initialCategories, onClose, onAdded }: { categories: any[]; onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [foodType, setFoodType] = useState('VEG');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [localCategories, setLocalCategories] = useState<any[]>(initialCategories);
  const [variants, setVariants] = useState<{name: string, price: string}[]>([]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) { toast.error('Enter a category name'); return; }
    setIsCreatingCategory(true);
    try {
      const res = await fetch('/api/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim(), sort_order: localCategories.length + 1 }),
      });
      if (res.ok) {
        const created = await res.json();
        setLocalCategories(prev => [...prev, { id: created.id, name: created.name, items: [] }]);
        setCategoryId(created.id);
        setNewCategoryName('');
        setShowNewCategory(false);
        toast.success(`Category "${created.name}" created`);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create category');
      }
    } catch { toast.error('Failed to create category'); }
    finally { setIsCreatingCategory(false); }
  };

  const handleSave = async () => {
    if (!name || !categoryId || !price) { toast.error('Fill required fields'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category_id: categoryId,
          food_type: foodType,
          price: parseFloat(price),
          description,
          variants: variants.length > 0 ? variants.map(v => ({ name: v.name, price: parseFloat(v.price) })) : null
        }),
      });
      if (res.ok) {
        toast.success(`${name} added to menu`);
        onAdded();
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add item');
      }
    } catch { toast.error('Network error. Failed to add item'); }
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium block" style={{ color: '#6B7280' }}>Category *</label>
              {!showNewCategory && (
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="flex items-center gap-1 text-xs font-bold cursor-pointer transition-colors bg-green-50 px-2 py-1 rounded-md"
                  style={{ color: '#10B981' }}
                >
                  <Plus className="w-3.5 h-3.5" /> New Category
                </button>
              )}
            </div>
            {!showNewCategory ? (
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ border: '1px solid #E5E7EB' }}>
                <option value="">Select category</option>
                {localCategories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Starters, Beverages"
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ border: '1px solid #10B981' }}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                />
                <button
                  onClick={handleCreateCategory}
                  disabled={isCreatingCategory}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer flex items-center gap-1"
                  style={{ backgroundColor: '#10B981' }}
                >
                  {isCreatingCategory ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                </button>
                <button
                  onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}
                  className="p-2 rounded-lg cursor-pointer"
                  style={{ color: '#6B7280' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium block" style={{ color: '#6B7280' }}>Base Price *</label>
            </div>
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6B7280' }}>₹</span>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full pl-8 pr-4 py-2 rounded-lg text-sm outline-none" style={{ border: '1px solid #E5E7EB', fontFamily: 'var(--font-mono)' }} min="1" />
            </div>
            
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium block" style={{ color: '#6B7280' }}>Variants (e.g., Half / Full)</label>
              <button 
                type="button" 
                onClick={() => setVariants([...variants, { name: '', price: '' }])}
                className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded cursor-pointer"
              >
                + Add Variant
              </button>
            </div>
            {variants.length > 0 && (
              <div className="space-y-2 mb-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                {variants.map((variant, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      placeholder="Name (e.g. 4 pcs)"
                      value={variant.name}
                      onChange={(e) => {
                        const newV = [...variants];
                        newV[index].name = e.target.value;
                        setVariants(newV);
                      }}
                      className="flex-1 px-3 py-1.5 rounded text-xs outline-none border border-gray-200"
                    />
                    <input
                      placeholder="₹ Price"
                      type="number"
                      value={variant.price}
                      onChange={(e) => {
                        const newV = [...variants];
                        newV[index].price = e.target.value;
                        setVariants(newV);
                      }}
                      className="w-20 px-3 py-1.5 rounded text-xs outline-none border border-gray-200 font-mono"
                    />
                    <button 
                      onClick={() => setVariants(variants.filter((_, i) => i !== index))}
                      className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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

function RecipeModal({ item, onClose }: { item: any; onClose: () => void }) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [recipe, setRecipe] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory').then(r => r.json()),
      fetch(`/api/recipes?menu_item_id=${item.id}`).then(r => r.json())
    ]).then(([mats, rec]) => {
      setMaterials(mats);
      setRecipe(rec.map((r: any) => ({ raw_material_id: r.raw_material_id, quantity_needed: r.quantity_needed })));
      setIsLoading(false);
    });
  }, [item.id]);

  const addIngredient = () => setRecipe([...recipe, { raw_material_id: '', quantity_needed: 1 }]);

  const updateIngredient = (index: number, field: string, val: any) => {
    const newR = [...recipe];
    newR[index][field] = val;
    setRecipe(newR);
  };

  const removeIngredient = (index: number) => {
    setRecipe(recipe.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_item_id: item.id, ingredients: recipe.filter(r => r.raw_material_id) }),
      });
      if (res.ok) {
        toast.success('Recipe updated successfully');
        onClose();
      } else {
        toast.error('Failed to update recipe');
      }
    } catch {
      toast.error('Error saving recipe');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Manage Recipe</h3>
            <p className="text-xs text-gray-500">{item.name}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer" /></button>
        </div>
        <div className="p-5">
          {isLoading ? <p className="text-center text-gray-500 text-sm">Loading...</p> : (
            <div className="space-y-4">
              {recipe.map((ing, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={ing.raw_material_id}
                    onChange={e => updateIngredient(i, 'raw_material_id', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
                  >
                    <option value="">Select Material</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit_type})</option>)}
                  </select>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={ing.quantity_needed}
                    onChange={e => updateIngredient(i, 'quantity_needed', e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
                  />
                  <button onClick={() => removeIngredient(i)} className="p-2 text-gray-400 hover:text-red-500 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button onClick={addIngredient} className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-600 hover:border-purple-300 hover:text-purple-600 font-medium transition-colors cursor-pointer">
                + Add Ingredient
              </button>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold cursor-pointer">Cancel</button>
          <button onClick={handleSave} disabled={isLoading || isSaving} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center cursor-pointer">
            {isSaving ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddBulkCategoryModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [categoriesText, setCategoriesText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    const names = categoriesText.split(/[\n,]+/).map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) { toast.error('Enter at least one category'); return; }
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names }),
      });
      if (res.ok) {
        toast.success(`Created ${names.length} categories`);
        onAdded();
        onClose();
      } else {
        toast.error('Failed to create categories');
      }
    } catch { toast.error('Failed to create categories'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl overflow-hidden p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-base font-heading">Add Categories</h3>
            <p className="text-xs text-gray-500 mt-1">Enter categories separated by comma or new line</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer" /></button>
        </div>
        <div className="space-y-4">
          <textarea
            value={categoriesText}
            onChange={(e) => setCategoriesText(e.target.value)}
            rows={5}
            placeholder="Starters&#10;Main Course&#10;Beverages"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none resize-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm cursor-pointer" style={{ backgroundColor: '#F5F5F3', color: '#6B7280' }}>Cancel</button>
            <button onClick={handleSave} disabled={isLoading} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer flex items-center justify-center gap-2" style={{ backgroundColor: '#10B981' }}>
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
