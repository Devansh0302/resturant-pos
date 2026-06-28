'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ShieldCheck, UserPlus, Lock, X, KeyRound, Trash2, Mail, User, Calculator, ChefHat, ConciergeBell } from 'lucide-react';

export default function StaffPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #10B98120, #059669  20)' }}>
          <Lock className="w-8 h-8" style={{ color: '#10B981' }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: '#1A1A1A' }}>
          Access Denied
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>Admin access required.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="section-header">
        <div className="section-icon" style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' }}>
          <ShieldCheck className="w-5 h-5" style={{ color: '#059669' }} />
        </div>
        <div>
          <h1 className="section-title">Staff Management</h1>
          <p className="section-subtitle">Manage restaurant employees, roles & credentials</p>
        </div>
      </div>
      <StaffManagement />
    </motion.div>
  );
}

function StaffManagement() {
  const [staff, setStaff] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'WAITER' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<{ id: string, name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => { fetch('/api/staff').then(r => r.json()).then(setStaff).catch(() => { }); }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success('Staff added successfully');
        setShowAddModal(false);
        setFormData({ name: '', email: '', password: '', role: 'WAITER' });
        const fresh = await fetch('/api/staff').then(r => r.json());
        setStaff(fresh);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add staff');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedStaff.id, password: newPassword })
      });
      if (res.ok) {
        toast.success(`Password updated for ${selectedStaff.name}`);
        setShowPasswordModal(false);
        setNewPassword('');
        setSelectedStaff(null);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update password');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch('/api/staff', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: !isActive }) });
    if (res.ok) {
      const fresh = await fetch('/api/staff').then(r => r.json());
      setStaff(fresh);
      toast.success(isActive ? 'Staff deactivated' : 'Staff activated');
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to update');
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/staff?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Staff member ${name} deleted successfully`);
        const fresh = await fetch('/api/staff').then(r => r.json());
        setStaff(fresh);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete staff');
      }
    } catch (error) {
      toast.error('An error occurred while deleting');
    }
  };

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'ADMIN': return { bg: 'linear-gradient(135deg, #10B981, #059669)', badge: 'badge-emerald', label: 'Admin', icon: ShieldCheck };
      case 'CASHIER': return { bg: 'linear-gradient(135deg, #F97316, #EA580C)', badge: 'badge-orange', label: 'Cashier', icon: Calculator };
      case 'KITCHEN': return { bg: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', badge: 'badge-purple', label: 'Kitchen', icon: ChefHat };
      default: return { bg: 'linear-gradient(135deg, #6B7280, #4B5563)', badge: 'badge-gray', label: 'Waiter', icon: ConciergeBell };
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const activeCount = staff.filter(s => s.is_active).length;
  const adminCount = staff.filter(s => s.role === 'ADMIN' && s.is_active).length;
  const cashierCount = staff.filter(s => s.role === 'CASHIER' && s.is_active).length;

  return (
    <div>
      {/* Stats Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: '#6B7280' }}>Total:</span>
            <span className="font-semibold" style={{ color: '#1A1A1A' }}>{staff.length}</span>
          </div>
          <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />
          <div className="flex items-center gap-2 text-sm">
            <span className="pulse-dot pulse-dot-green" />
            <span style={{ color: '#6B7280' }}>Active: {activeCount}</span>
          </div>
          <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: '#6B7280' }}>Admins: {adminCount}/2</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: '#6B7280' }}>Cashiers: {cashierCount}/2</span>
          </div>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <UserPlus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((s, index) => {
          const rc = getRoleConfig(s.role);
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
              className="premium-card"
              style={{ opacity: s.is_active ? 1 : 0.6 }}
            >
              <div style={{ padding: '20px' }}>
                {/* Top row: Avatar + Info + Toggle */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="avatar avatar-md" style={{ background: rc.bg }}>
                      {getInitials(s.name)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{s.name}</h3>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>{s.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(s.id, s.is_active)}
                    className={`toggle-switch ${s.is_active ? 'toggle-switch-on' : 'toggle-switch-off'}`}
                    title={s.is_active ? 'Deactivate' : 'Activate'}
                  >
                    <span className={`toggle-knob ${s.is_active ? 'toggle-knob-on' : 'toggle-knob-off'}`} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className={`badge ${rc.badge}`}>
                    <rc.icon className="w-3 h-3" /> {rc.label}
                  </span>
                  <span className={`badge ${s.is_active ? 'badge-active' : 'badge-inactive'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="text-xs text-gray-500 mb-4 px-1 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  Total Orders Handled: <span className="font-semibold text-gray-700">{s._count?.orders || 0}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1" style={{ borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
                  <button
                    onClick={() => { setSelectedStaff({ id: s.id, name: s.name }); setShowPasswordModal(true); }}
                    className="btn-icon"
                    title="Change Password"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(s.id, s.name)}
                    className="btn-icon"
                    style={{ color: '#EF4444' }}
                    title="Delete Staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {staff.length === 0 && (
        <div className="empty-state">
          <ShieldCheck className="empty-state-icon" style={{ width: 48, height: 48, margin: '0 auto 16px' }} />
          <p className="empty-state-title">No staff members yet</p>
          <p className="empty-state-desc">Click &quot;Add Staff&quot; to add your first team member</p>
        </div>
      )}

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="modal-backdrop">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="modal-content"
              style={{ maxWidth: '440px' }}
            >
              <div className="modal-header">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' }}>
                    <UserPlus className="w-4 h-4" style={{ color: '#059669' }} />
                  </div>
                  <h3 className="font-semibold" style={{ color: '#1A1A1A', fontFamily: 'var(--font-heading)' }}>Add New Staff</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="btn-icon">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddStaff} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#374151' }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="premium-input" style={{ paddingLeft: '36px' }} placeholder="e.g. John Doe" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#374151' }}>Login ID (Email)</label>
                  <div style={{ position: 'relative' }}>
                    <Mail className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input required type="email" value={formData.email} onChange={e => {
                      let val = e.target.value;
                      if (val.endsWith('@') && val.indexOf('@') === val.length - 1 && val.length > formData.email.length) {
                        val = val + 'spiceroute.in';
                      }
                      setFormData({ ...formData, email: val });
                    }} className="premium-input" style={{ paddingLeft: '36px' }} placeholder="john@spiceroute.in" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#374151' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input required type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="premium-input" style={{ paddingLeft: '36px' }} placeholder="Assign a password" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#374151' }}>Role</label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="premium-select">
                    <option value="ADMIN">Admin</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="WAITER">Waiter</option>
                    <option value="KITCHEN">Kitchen</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1 }}>
                    {isSubmitting ? 'Adding...' : 'Add Staff'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && selectedStaff && (
          <div className="modal-backdrop">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="modal-content"
              style={{ maxWidth: '420px' }}
            >
              <div className="modal-header">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
                    <KeyRound className="w-4 h-4" style={{ color: '#2563EB' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: '#1A1A1A', fontFamily: 'var(--font-heading)' }}>Change Password</h3>
                    <p className="text-xs" style={{ color: '#6B7280' }}>{selectedStaff.name}</p>
                  </div>
                </div>
                <button onClick={() => { setShowPasswordModal(false); setNewPassword(''); setSelectedStaff(null); }} className="btn-icon">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleChangePasswordSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#374151' }}>New Password</label>
                  <input required type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="premium-input" placeholder="Enter new password" />
                </div>
                <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                  <button type="button" onClick={() => { setShowPasswordModal(false); setNewPassword(''); setSelectedStaff(null); }} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" disabled={isChangingPassword} className="btn-primary" style={{ flex: 1 }}>
                    {isChangingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
