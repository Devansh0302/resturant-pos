'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Building2, Calendar, CheckCircle2, XCircle, MoreVertical, Shield, Mail, Package, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type PlanType = { id: string; name: string; slug: string; duration: number; price: number; is_active: boolean };
type AddOnType = { id: string; name: string; description: string | null; price: number; is_active: boolean };

const AddTenantModal = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupResult, setSetupResult] = useState<{ email: string; setupUrl: string; name: string } | null>(null);

  // Plans & add-ons from DB
  const [plans, setPlans] = useState<PlanType[]>([]);
  const [addons, setAddons] = useState<AddOnType[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, addonsRes] = await Promise.all([
          fetch('/api/super-admin/plans'),
          fetch('/api/super-admin/addons'),
        ]);
        if (plansRes.ok) {
          const plansData = await plansRes.json();
          const activePlans = plansData.filter((p: PlanType) => p.is_active);
          setPlans(activePlans);
          // Default select yearly plan
          const yearly = activePlans.find((p: PlanType) => p.slug === 'yearly');
          if (yearly) setSelectedPlanId(yearly.id);
          else if (activePlans.length > 0) setSelectedPlanId(activePlans[0].id);
        }
        if (addonsRes.ok) {
          const addonsData = await addonsRes.json();
          setAddons(addonsData.filter((a: AddOnType) => a.is_active));
        }
      } catch { } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const selectedAddonsTotal = Array.from(selectedAddonIds).reduce((sum, id) => {
    const addon = addons.find(a => a.id === id);
    return sum + (addon?.price || 0);
  }, 0);
  const grandTotal = (selectedPlan?.price || 0) + selectedAddonsTotal;

  const toggleAddon = (id: string) => {
    setSelectedAddonIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPlanId) {
      toast.error('Please select a subscription plan');
      return;
    }
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());
    data.planId = selectedPlanId;
    data.addonIds = Array.from(selectedAddonIds);
    data.subscriptionPlan = selectedPlan?.slug || 'yearly';

    try {
      const res = await fetch('/api/super-admin/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        setSetupResult({
          email: data.ownerEmail as string,
          setupUrl: result.setupUrl,
          name: data.name as string,
        });
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to provision tenant');
      }
    } catch (error) {
      toast.error('Failed to provision tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Screen
  if (setupResult) {
    return (
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Tenant Provisioned! 🎉</h2>
            <p className="text-sm text-gray-500 mb-6">
              <strong>{setupResult.name}</strong> has been created. A setup invite has been sent to <strong>{setupResult.email}</strong>.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 text-left">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Password Setup Link</label>
              <div className="flex items-center gap-2">
                <input type="text" readOnly value={setupResult.setupUrl}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono truncate"
                  onClick={(e) => (e.target as HTMLInputElement).select()} />
                <button type="button"
                  onClick={() => { navigator.clipboard.writeText(setupResult.setupUrl); toast.success('Link copied!'); }}
                  className="px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer flex-shrink-0">
                  Copy
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Share this link with the restaurant owner, or open it yourself to test.</p>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition-colors cursor-pointer border border-gray-200">
                Done
              </button>
              <a href={setupResult.setupUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer text-center shadow-md">
                Open Setup Link ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl pointer-events-none">
            <div className="w-32 h-32 bg-indigo-500 rounded-full"></div>
          </div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Provision Tenant</h2>
              <p className="text-xs text-gray-500 mt-0.5">Create a new isolated restaurant environment.</p>
            </div>
          </div>
        </div>

        {isLoadingData ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Basic Info */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Restaurant Name</label>
                <input required name="name" type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-400 shadow-sm" placeholder="e.g. Burger Hub" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Owner Name</label>
                  <input required name="ownerName" type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-400 shadow-sm" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Owner Email</label>
                  <input required name="ownerEmail" type="email" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-400 shadow-sm" placeholder="john@burgerhub.com" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Max Staff Profiles</label>
                <input required name="max_staff_profiles" type="number" min="1" defaultValue="5" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-400 shadow-sm" />
              </div>

              {/* Subscription Plan Selection */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-2">Subscription Plan</label>
                <div className="grid grid-cols-3 gap-2">
                  {plans.map(plan => (
                    <button key={plan.id} type="button" onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                        selectedPlanId === plan.id
                          ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                      <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${selectedPlanId === plan.id ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {plan.name}
                      </div>
                      <div className={`text-lg font-bold ${selectedPlanId === plan.id ? 'text-indigo-700' : 'text-gray-900'}`}>
                        ₹{plan.price.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {plan.duration} {plan.duration === 1 ? 'month' : 'months'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add-ons */}
              {addons.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                    <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Add-ons</span>
                  </label>
                  <div className="space-y-2">
                    {addons.map(addon => (
                      <div key={addon.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          selectedAddonIds.has(addon.id)
                            ? 'border-violet-200 bg-violet-50/50'
                            : 'border-gray-200 bg-white'
                        }`}>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <span className="text-sm font-bold text-gray-900">{addon.name}</span>
                            {addon.description && <p className="text-xs text-gray-500 mt-0.5">{addon.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-sm font-bold text-gray-900">₹{addon.price.toLocaleString('en-IN')}</span>
                          <button
                            type="button"
                            onClick={() => toggleAddon(addon.id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                              selectedAddonIds.has(addon.id) ? 'bg-violet-600' : 'bg-gray-200'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                              selectedAddonIds.has(addon.id) ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Info */}
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <Mail className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  An <strong>email invite</strong> will be sent to the owner to set their password and PIN.
                </p>
              </div>
            </div>

            {/* Fixed Footer with Total */}
            <div className="border-t border-gray-100 bg-gray-50/95 p-5 flex-shrink-0 z-10 relative">
              {/* Price Breakdown */}
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Plan ({selectedPlan?.name || '—'})</span>
                  <span className="font-semibold text-gray-900">₹{(selectedPlan?.price || 0).toLocaleString('en-IN')}</span>
                </div>
                {selectedAddonIds.size > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Add-ons ({selectedAddonIds.size})</span>
                    <span className="font-semibold text-gray-900">₹{selectedAddonsTotal.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-base pt-1.5 border-t border-gray-200">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-indigo-600 text-lg">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-3 bg-white hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition-colors cursor-pointer border border-gray-200">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-md">
                  {isSubmitting ? 'Provisioning...' : 'Provision & Send Invite'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const ManageSubModal = ({ managingSubFor, onClose, onRenew }: { managingSubFor: any, onClose: () => void, onRenew: (id: string, date: string) => Promise<void> }) => {
  const [mode, setMode] = useState<'preset' | 'days' | 'date'>('preset');
  const [customDays, setCustomDays] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentEnd = managingSubFor.subscription_end_date ? new Date(managingSubFor.subscription_end_date) : new Date();

  const applyExtension = (months: number) => {
    setIsSubmitting(true);
    const d = new Date(currentEnd);
    d.setMonth(d.getMonth() + months);
    onRenew(managingSubFor.id, d.toISOString()).finally(() => setIsSubmitting(false));
  };

  const applyCustomDays = () => {
    const days = parseInt(customDays);
    if (isNaN(days) || days <= 0) {
      toast.error("Enter a valid number of days");
      return;
    }
    setIsSubmitting(true);
    const d = new Date(currentEnd);
    d.setDate(d.getDate() + days);
    onRenew(managingSubFor.id, d.toISOString()).finally(() => setIsSubmitting(false));
  };

  const applyCustomDate = () => {
    if (!customDate) {
      toast.error("Select a date");
      return;
    }
    setIsSubmitting(true);
    const d = new Date(customDate);
    onRenew(managingSubFor.id, d.toISOString()).finally(() => setIsSubmitting(false));
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Manage Subscription</h2>
          <p className="text-xs text-gray-500 mt-0.5">{managingSubFor.name}</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button onClick={() => setMode('preset')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${mode === 'preset' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Presets</button>
            <button onClick={() => setMode('days')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${mode === 'days' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Add Days</button>
            <button onClick={() => setMode('date')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${mode === 'date' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Set Date</button>
          </div>

          {mode === 'preset' && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => applyExtension(1)} disabled={isSubmitting} className="py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold transition-colors cursor-pointer border border-indigo-200">+ 1 Month</button>
              <button onClick={() => applyExtension(3)} disabled={isSubmitting} className="py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold transition-colors cursor-pointer border border-indigo-200">+ 3 Months</button>
              <button onClick={() => applyExtension(6)} disabled={isSubmitting} className="py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold transition-colors cursor-pointer border border-indigo-200">+ 6 Months</button>
              <button onClick={() => applyExtension(12)} disabled={isSubmitting} className="py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold transition-colors cursor-pointer border border-indigo-200">+ 12 Months</button>
            </div>
          )}

          {mode === 'days' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Number of Days to Extend</label>
                <input type="number" value={customDays} onChange={(e) => setCustomDays(e.target.value)} min="1" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-400" placeholder="e.g. 29" />
              </div>
              <button onClick={applyCustomDays} disabled={isSubmitting} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-md">Apply Extension</button>
            </div>
          )}

          {mode === 'date' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Absolute Expiry Date</label>
                <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              </div>
              <button onClick={applyCustomDate} disabled={isSubmitting} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-md">Set Expiry Date</button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors cursor-pointer hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ManageAddonsModal = ({ tenant, onClose }: { tenant: any, onClose: () => void }) => {
  const [addons, setAddons] = useState<AddOnType[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchAddons = async () => {
      try {
        const [allAddonsRes, tenantAddonsRes] = await Promise.all([
          fetch('/api/super-admin/addons'),
          fetch(`/api/super-admin/restaurants/${tenant.id}/addons`),
        ]);
        
        if (allAddonsRes.ok && tenantAddonsRes.ok) {
          const all = await allAddonsRes.json();
          const active = all.filter((a: AddOnType) => a.is_active);
          setAddons(active);

          const tenantAddons = await tenantAddonsRes.json();
          setSelectedAddonIds(new Set(tenantAddons.map((a: AddOnType) => a.id)));
        }
      } catch {
        toast.error('Failed to load add-ons');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAddons();
  }, [tenant.id]);

  const toggleAddon = (id: string) => {
    setSelectedAddonIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/super-admin/restaurants/${tenant.id}/addons`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonIds: Array.from(selectedAddonIds) }),
      });
      if (res.ok) {
        toast.success('Add-ons updated successfully');
        onClose();
      } else {
        toast.error('Failed to update add-ons');
      }
    } catch {
      toast.error('Failed to update add-ons');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shadow-sm">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Manage Add-ons</h2>
              <p className="text-xs text-gray-500 mt-0.5">{tenant.name}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
          ) : addons.length === 0 ? (
            <div className="text-center text-gray-500 text-sm p-4">No active add-ons available.</div>
          ) : (
            <div className="space-y-2">
              {addons.map(addon => (
                <div key={addon.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    selectedAddonIds.has(addon.id)
                      ? 'border-violet-200 bg-violet-50/50'
                      : 'border-gray-200 bg-white'
                  }`}>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <span className="text-sm font-bold text-gray-900">{addon.name}</span>
                      {addon.description && <p className="text-xs text-gray-500 mt-0.5">{addon.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-900">₹{addon.price.toLocaleString('en-IN')}</span>
                    <button
                      type="button"
                      onClick={() => toggleAddon(addon.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                        selectedAddonIds.has(addon.id) ? 'bg-violet-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                        selectedAddonIds.has(addon.id) ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors cursor-pointer hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={isSaving || isLoading} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer hover:bg-indigo-700 disabled:opacity-50 shadow-md">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteTenantModal = ({ tenant, onClose, onDelete }: { tenant: any, onClose: () => void, onDelete: (id: string) => Promise<void> }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmText.toLowerCase() === tenant.name.toLowerCase();

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(tenant.id);
    setIsDeleting(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Delete Tenant</h2>
              <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone.</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700 leading-relaxed">
              You are about to delete <strong>{tenant.name}</strong>. All associated data including orders, menu items, staff, and tables will be permanently marked as deleted.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">
              Type <span className="text-red-600">"{tenant.name}"</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={tenant.name}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder-gray-300 shadow-sm"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors cursor-pointer hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            {isDeleting ? 'Deleting...' : 'Delete Tenant'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TenantsPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [managingSubFor, setManagingSubFor] = useState<any>(null);
  const [managingAddonsFor, setManagingAddonsFor] = useState<any>(null);
  const [deletingTenant, setDeletingTenant] = useState<any>(null);

  const fetchRestaurants = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/restaurants');
      const data = await res.json();
      if (res.ok) setRestaurants(data);
    } catch (e) {
      toast.error('Failed to fetch restaurants');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants(true);
    const interval = setInterval(() => fetchRestaurants(false), 30000);
    return () => clearInterval(interval);
  }, [fetchRestaurants]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/super-admin/restaurants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Restaurant ${newStatus.toLowerCase()}`);
        fetchRestaurants();
      } else {
        toast.error('Failed to update status');
      }
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const handleRenew = async (id: string, newEndDate: string) => {
    try {
      const res = await fetch(`/api/super-admin/restaurants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_end_date: newEndDate, subscription_status: 'ACTIVE' }),
      });
      if (res.ok) {
        toast.success('Subscription updated successfully');
        fetchRestaurants();
        setManagingSubFor(null);
      } else {
        toast.error('Failed to update subscription');
      }
    } catch (e) {
      toast.error('Failed to update subscription');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/super-admin/restaurants/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Tenant deleted successfully');
        setDeletingTenant(null);
        fetchRestaurants(true);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to delete tenant');
      }
    } catch (e) {
      toast.error('Failed to delete tenant');
    }
  };

  const filtered = restaurants.filter(r => r.subscription_status !== 'DELETED' && (r.name.toLowerCase().includes(search.toLowerCase()) || r.id.includes(search)));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Tenants Management</h1>
          <p className="text-sm text-gray-500">View and manage all restaurants hosted on the platform.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Provision Tenant
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search tenants by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
            />
          </div>
          <div className="text-xs font-mono text-gray-500 font-medium">
            {filtered.length} Tenants Found
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Tenant Info</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Primary Owner</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Onboarded Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">License Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Valid Until</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(restaurant => (
                  <tr key={restaurant.id} onClick={() => router.push(`/super-admin/restaurants/${restaurant.id}`)} className="hover:bg-gray-50/80 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shadow-sm">
                          {restaurant.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{restaurant.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">{restaurant.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                        <Shield className="w-3.5 h-3.5 text-gray-400" />
                        {restaurant.staff?.[0]?.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {restaurant.created_at ? new Date(restaurant.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        restaurant.subscription_status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${restaurant.subscription_status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        {restaurant.subscription_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {restaurant.subscription_end_date ? new Date(restaurant.subscription_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setManagingSubFor(restaurant); }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          Manage Sub
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setManagingAddonsFor(restaurant); }}
                          className="px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 border border-violet-100 text-xs font-bold hover:bg-violet-100 transition-colors cursor-pointer"
                        >
                          Manage Add-ons
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleToggleStatus(restaurant.id, restaurant.subscription_status); }}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                            restaurant.subscription_status === 'ACTIVE' 
                              ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                          }`}
                        >
                          {restaurant.subscription_status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDeletingTenant(restaurant); }}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                      No tenants found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {showAddModal && <AddTenantModal onClose={() => setShowAddModal(false)} onSuccess={() => fetchRestaurants(true)} />}
      {managingSubFor && <ManageSubModal managingSubFor={managingSubFor} onClose={() => setManagingSubFor(null)} onRenew={handleRenew} />}
      {managingAddonsFor && <ManageAddonsModal tenant={managingAddonsFor} onClose={() => setManagingAddonsFor(null)} />}
      {deletingTenant && <DeleteTenantModal tenant={deletingTenant} onClose={() => setDeletingTenant(null)} onDelete={handleDelete} />}
    </div>
  );
}
