'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Building2, Users, ShoppingCart, UtensilsCrossed, LayoutGrid, Calendar, Shield, Edit, Trash2, RefreshCw, DollarSign, KeyRound, Eye, Palette, Globe } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Mail, Smartphone, Truck } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';

export default function TenantDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [resetStaff, setResetStaff] = useState<any>(null);
  const [showManageSub, setShowManageSub] = useState(false);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [themeColor, setThemeColor] = useState<string>('');
  const [customDomain, setCustomDomain] = useState<string>('');
  const [maxStaffProfiles, setMaxStaffProfiles] = useState<number>(5);

  const fetchDetail = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await fetch(`/api/super-admin/restaurants/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      if (res.ok) {
        setRestaurant(data);
        setThemeColor(data.theme_color || '#4f46e5');
        setCustomDomain(data.custom_domain || '');
        setMaxStaffProfiles(data.max_staff_profiles || 5);
      }
    } catch {
      toast.error('Failed to load tenant');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail(true);
    const interval = setInterval(() => fetchDetail(false), 30000);
    return () => clearInterval(interval);
  }, [fetchDetail]);

  const handleToggleStatus = async () => {
    const newStatus = restaurant.subscription_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const res = await fetch(`/api/super-admin/restaurants/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_status: newStatus }),
    });
    if (res.ok) { toast.success(`Tenant ${newStatus.toLowerCase()}`); fetchDetail(); }
  };

  const handleToggleFeature = async (featureName: string, currentValue: boolean | string) => {
    const newValue = typeof currentValue === 'boolean' ? !currentValue : currentValue;
    const res = await fetch(`/api/super-admin/restaurants/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [featureName]: newValue }),
    });
    if (res.ok) { 
      const updatedRestaurant = await res.json();
      setRestaurant((prev: any) => ({ ...prev, ...updatedRestaurant }));
      toast.success('Tenant settings updated'); 
    }
    else { toast.error('Failed to update tenant settings'); }
  };

  const handleRenew = async (newEndDate: string) => {
    const res = await fetch(`/api/super-admin/restaurants/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_end_date: newEndDate, subscription_status: 'ACTIVE' }),
    });
    if (res.ok) { 
      toast.success('Subscription updated'); 
      fetchDetail(); 
      setShowManageSub(false); 
    } else {
      toast.error('Failed to update subscription');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) return;
    const res = await fetch(`/api/super-admin/restaurants/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Tenant deleted'); router.push('/super-admin/restaurants'); }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const res = await fetch(`/api/super-admin/restaurants/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) { toast.success('Tenant updated'); setShowEditModal(false); fetchDetail(); }
    else toast.error('Update failed');
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get('newPassword') as string;

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const res = await fetch(`/api/super-admin/staff/${resetStaff.id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });

    if (res.ok) {
      toast.success('Password reset successfully');
      setResetStaff(null);
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to reset password');
    }
  };

  const handleImpersonate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const superAdminEmail = formData.get('email') as string;
    const superAdminPassword = formData.get('password') as string;

    setIsLoading(true);
    const res = await signIn('credentials', {
      redirect: false,
      email: superAdminEmail,
      password: superAdminPassword,
      impersonateTenantId: id,
    });

    if (res?.error) {
      toast.error('Invalid super admin credentials');
      setIsLoading(false);
    } else {
      toast.success('Impersonation started');
      window.location.href = '/dashboard';
    }
  };

  if (isLoading) return (
    <div className="p-8 flex justify-center items-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (!restaurant) return (
    <div className="p-8 text-center text-gray-500">Tenant not found.</div>
  );

  // Removed stats array per user request

  const ManageSubModal = () => {
    const [mode, setMode] = useState<'preset' | 'days' | 'date'>('preset');
    const [customDays, setCustomDays] = useState('');
    const [customDate, setCustomDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentEnd = restaurant.subscription_end_date ? new Date(restaurant.subscription_end_date) : new Date();

    const applyExtension = (months: number) => {
      setIsSubmitting(true);
      const d = new Date(currentEnd);
      d.setMonth(d.getMonth() + months);
      handleRenew(d.toISOString()).finally(() => setIsSubmitting(false));
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
      handleRenew(d.toISOString()).finally(() => setIsSubmitting(false));
    };

    const applyCustomDate = () => {
      if (!customDate) {
        toast.error("Select a date");
        return;
      }
      setIsSubmitting(true);
      const d = new Date(customDate);
      handleRenew(d.toISOString()).finally(() => setIsSubmitting(false));
    };

    return (
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Manage Subscription</h2>
            <p className="text-xs text-gray-500 mt-0.5">{restaurant.name}</p>
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
            <button type="button" onClick={() => setShowManageSub(false)} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors cursor-pointer hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Link href="/super-admin/restaurants" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Tenants
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold shadow-sm">
            {restaurant.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{restaurant.id}</p>
          </div>
          <span className={`ml-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase border ${
            restaurant.subscription_status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${restaurant.subscription_status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            {restaurant.subscription_status}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEditModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer">
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => setShowImpersonateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-bold hover:bg-rose-100 transition-colors shadow-sm cursor-pointer">
            <Eye className="w-4 h-4" /> Impersonate
          </button>
          <button onClick={() => setShowManageSub(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" /> Manage Sub
          </button>
          <button onClick={handleToggleStatus} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer ${
            restaurant.subscription_status === 'ACTIVE' ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
          }`}>
            {restaurant.subscription_status === 'ACTIVE' ? 'Suspend' : 'Activate'}
          </button>
          <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-sm font-medium hover:bg-rose-100 transition-colors shadow-sm cursor-pointer">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Tenant Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { label: 'Address', value: restaurant.address || '—' },
              { label: 'Phone', value: restaurant.phone || '—' },
              { label: 'GSTIN', value: restaurant.gstin || '—' },
              { label: 'FSSAI No.', value: restaurant.fssai_no || '—' },
              { label: 'CGST Rate', value: `${restaurant.cgst_rate}%` },
              { label: 'SGST Rate', value: `${restaurant.sgst_rate}%` },
              { label: 'Subscription Ends', value: restaurant.subscription_end_date ? new Date(restaurant.subscription_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
              { label: 'Created', value: new Date(restaurant.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
            ].map((item, i) => (
              <div key={i}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Flags Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Modules & Integrations</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Swiggy Sync</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">Automated orders & menu sync</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleFeature('swiggy_enabled', restaurant.swiggy_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${restaurant.swiggy_enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${restaurant.swiggy_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Zomato Sync</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">Automated orders & menu sync</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleFeature('zomato_enabled', restaurant.zomato_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${restaurant.zomato_enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${restaurant.zomato_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Daily E-Reports</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">Automated daily summary emails</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleFeature('daily_email_report_enabled', restaurant.daily_email_report_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${restaurant.daily_email_report_enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${restaurant.daily_email_report_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 mt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Custom Domain</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">White-label URL (e.g. pos.example.com)</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 pl-11">
                <input 
                  type="text" 
                  value={customDomain} 
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="pos.yourdomain.com"
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
                <button 
                  onClick={() => handleToggleFeature('custom_domain', customDomain)}
                  className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 cursor-pointer shadow-sm transition-all"
                >
                  Save Domain
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 mt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Max Staff Profiles</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">Limit number of staff accounts</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 pl-11">
                <input 
                  type="number" 
                  min="1"
                  value={maxStaffProfiles} 
                  onChange={(e) => setMaxStaffProfiles(parseInt(e.target.value) || 5)}
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
                <button 
                  onClick={() => handleToggleFeature('max_staff_profiles', maxStaffProfiles as any)}
                  className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 cursor-pointer shadow-sm transition-all"
                >
                  Save Limit
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>



      {/* Staff Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Staff Members</h2>
        </div>
        {restaurant.staff?.length > 0 ? (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Name</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Email</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">PIN</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {restaurant.staff.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900">{s.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{s.email}</td>
                  <td className="px-6 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">{s.role}</span></td>
                  <td className="px-6 py-3 text-sm text-gray-500 font-mono">{s.pin}</td>
                  <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => setResetStaff(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors shadow-sm"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-gray-500" />
                      Reset Pwd
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">No staff members found.</div>
        )}
      </div>

      {/* Recent SaaS Payments */}
      {restaurant.payments?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">SaaS Payment History</h2>
          </div>
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50">
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Method</th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Reference</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {restaurant.payments.map((p: any) => (
                <tr key={p.id}>
                  <td className="px-6 py-3 text-sm text-gray-600">{new Date(p.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">₹{p.amount.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{p.payment_method}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 font-mono">{p.reference_no || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Edit Tenant</h2>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Name</label>
                  <input name="name" defaultValue={restaurant.name} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Phone</label>
                  <input name="phone" defaultValue={restaurant.phone || ''} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Address</label>
                <input name="address" defaultValue={restaurant.address || ''} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">GSTIN</label>
                  <input name="gstin" defaultValue={restaurant.gstin || ''} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">FSSAI No.</label>
                  <input name="fssai_no" defaultValue={restaurant.fssai_no || ''} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">CGST Rate (%)</label>
                  <input name="cgst_rate" type="number" step="0.1" defaultValue={restaurant.cgst_rate} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">SGST Rate (%)</label>
                  <input name="sgst_rate" type="number" step="0.1" defaultValue={restaurant.sgst_rate} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition-colors cursor-pointer border border-gray-200">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer shadow-md">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetStaff && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
              <p className="text-xs text-gray-500 mt-1">For <span className="font-semibold text-gray-700">{resetStaff.name}</span> ({resetStaff.email})</p>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">New Password</label>
                <input
                  name="newPassword"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Enter new password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                />
                <p className="text-xs text-gray-400 mt-2">Must be at least 6 characters long.</p>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setResetStaff(null)} className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition-colors cursor-pointer border border-gray-200">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer shadow-md">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showManageSub && <ManageSubModal />}

      {/* Impersonate Modal */}
      {showImpersonateModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-rose-100 bg-rose-50/50">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-5 h-5 text-rose-600" />
                <h2 className="text-xl font-bold text-gray-900">Impersonate Tenant</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">Verify your Super Admin credentials to login as <strong className="text-gray-900">{restaurant.name}</strong>.</p>
            </div>
            <form onSubmit={handleImpersonate} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Your Admin Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="admin@nxtdine.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Your Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-sm"
                />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowImpersonateModal(false)} className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition-colors cursor-pointer border border-gray-200">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer shadow-md">Start Impersonation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
