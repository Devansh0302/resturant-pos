'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, CheckCircle, CreditCard, Package, Plus, Pencil, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Plan = { id: string; name: string; slug: string; duration: number; price: number; is_active: boolean };
type AddOn = { id: string; name: string; description: string | null; price: number; is_active: boolean };

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Edit states for plans
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanPrice, setEditPlanPrice] = useState('');

  // Add-on modal
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState<AddOn | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [settingsRes, plansRes, addonsRes] = await Promise.all([
        fetch('/api/super-admin/settings'),
        fetch('/api/super-admin/plans'),
        fetch('/api/super-admin/addons'),
      ]);
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (plansRes.ok) setPlans(await plansRes.json());
      if (addonsRes.ok) setAddons(await addonsRes.json());
    } catch { } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/super-admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSettings(await res.json());
        toast.success('Settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePlanPrice = async (planId: string) => {
    try {
      const res = await fetch('/api/super-admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planId, price: Number(editPlanPrice) }),
      });
      if (res.ok) {
        toast.success('Plan price updated');
        setEditingPlanId(null);
        fetchAll();
      }
    } catch {
      toast.error('Failed to update plan');
    }
  };

  const handleTogglePlan = async (plan: Plan) => {
    try {
      const res = await fetch('/api/super-admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, is_active: !plan.is_active }),
      });
      if (res.ok) {
        toast.success(`Plan ${plan.is_active ? 'disabled' : 'enabled'}`);
        fetchAll();
      }
    } catch {
      toast.error('Failed to update plan');
    }
  };

  const handleSaveAddon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      if (editingAddon) {
        const res = await fetch('/api/super-admin/addons', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingAddon.id, ...data, price: Number(data.price) }),
        });
        if (res.ok) toast.success('Add-on updated');
      } else {
        const res = await fetch('/api/super-admin/addons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, price: Number(data.price) }),
        });
        if (res.ok) toast.success('Add-on created');
      }
      setShowAddonModal(false);
      setEditingAddon(null);
      fetchAll();
    } catch {
      toast.error('Failed to save add-on');
    }
  };

  const handleToggleAddon = async (addon: AddOn) => {
    try {
      await fetch('/api/super-admin/addons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: addon.id, is_active: !addon.is_active }),
      });
      toast.success(`Add-on ${addon.is_active ? 'disabled' : 'enabled'}`);
      fetchAll();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDeleteAddon = async (id: string) => {
    if (!confirm('Delete this add-on permanently?')) return;
    try {
      const res = await fetch(`/api/super-admin/addons?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Add-on deleted'); fetchAll(); }
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (isLoading) return (
    <div className="p-8 flex justify-center items-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Platform Settings</h1>
        <p className="text-sm text-gray-500">Configure global platform behavior, pricing, and add-ons.</p>
      </div>

      {/* General Settings */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Settings className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">General</h2>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Platform Name</label>
              <input name="platform_name" defaultValue={settings?.platform_name || 'NXTDINE'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Support Email</label>
              <input name="support_email" type="email" defaultValue={settings?.support_email || 'support@bitepoint.com'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Default CGST Rate (%)</label>
                <input name="default_cgst_rate" type="number" step="0.1" defaultValue={settings?.default_cgst_rate || 2.5}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Default SGST Rate (%)</label>
                <input name="default_sgst_rate" type="number" step="0.1" defaultValue={settings?.default_sgst_rate || 2.5}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={isSaving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer shadow-md disabled:opacity-50">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Subscription Plans */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CreditCard className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Subscription Plans</h2>
        </div>

        <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${plan.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-500">{plan.duration} {plan.duration === 1 ? 'month' : 'months'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {editingPlanId === plan.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">₹</span>
                    <input
                      type="number"
                      value={editPlanPrice}
                      onChange={(e) => setEditPlanPrice(e.target.value)}
                      className="w-24 border border-indigo-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      autoFocus
                    />
                    <button onClick={() => handleUpdatePlanPrice(plan.id)} className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 cursor-pointer">Save</button>
                    <button onClick={() => setEditingPlanId(null)} className="px-2.5 py-1.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-100 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-lg font-bold text-gray-900">₹{plan.price.toLocaleString('en-IN')}</span>
                    <button
                      onClick={() => { setEditingPlanId(plan.id); setEditPlanPrice(String(plan.price)); }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleTogglePlan(plan)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${plan.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${plan.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add-ons */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
              <Package className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Add-ons</h2>
          </div>
          <button
            onClick={() => { setEditingAddon(null); setShowAddonModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-600 border border-violet-200 rounded-lg text-xs font-bold hover:bg-violet-100 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Feature
          </button>
        </div>

        {addons.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No add-ons configured yet. Click "Add New Feature" to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {addons.map(addon => (
              <div key={addon.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${addon.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="text-sm font-bold text-gray-900">{addon.name}</h3>
                  {addon.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{addon.description}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-bold text-gray-900">₹{addon.price.toLocaleString('en-IN')}</span>
                  <button
                    onClick={() => { setEditingAddon(addon); setShowAddonModal(true); }}
                    className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleAddon(addon)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${addon.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${addon.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <button
                    onClick={() => handleDeleteAddon(addon.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last Updated */}
      {settings?.updated_at && (
        <p className="text-xs text-gray-400 text-center font-mono">
          Last updated: {new Date(settings.updated_at).toLocaleString()}
        </p>
      )}

      {/* Add-on Modal */}
      {showAddonModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">{editingAddon ? 'Edit Add-on' : 'New Add-on'}</h2>
            </div>
            <form onSubmit={handleSaveAddon} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Feature Name</label>
                <input required name="name" defaultValue={editingAddon?.name || ''}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                  placeholder="e.g. KDS Module" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Description</label>
                <input name="description" defaultValue={editingAddon?.description || ''}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                  placeholder="Brief description" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Price (₹)</label>
                <input required name="price" type="number" min="0" step="1" defaultValue={editingAddon?.price || ''}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                  placeholder="e.g. 499" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAddonModal(false); setEditingAddon(null); }}
                  className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition-colors cursor-pointer border border-gray-200">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer shadow-md">
                  {editingAddon ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
