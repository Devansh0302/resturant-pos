'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchBroadcasts = async () => {
    try {
      const res = await fetch('/api/super-admin/broadcasts');
      if (res.ok) {
        const data = await res.json();
        setBroadcasts(data);
      }
    } catch {
      toast.error('Failed to load broadcasts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/super-admin/broadcasts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current })
      });
      if (res.ok) {
        toast.success('Broadcast updated');
        fetchBroadcasts();
      }
    } catch {
      toast.error('Failed to update broadcast');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this broadcast?')) return;
    try {
      const res = await fetch(`/api/super-admin/broadcasts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Broadcast deleted');
        fetchBroadcasts();
      }
    } catch {
      toast.error('Failed to delete broadcast');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      message: formData.get('message') as string,
      type: formData.get('type') as string,
    };

    try {
      const res = await fetch('/api/super-admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        toast.success('Broadcast created successfully');
        setShowModal(false);
        fetchBroadcasts();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create broadcast');
      }
    } catch {
      toast.error('Failed to create broadcast');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'WARNING': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'ERROR': return <XCircle className="w-5 h-5 text-rose-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Global Broadcasts</h1>
            <p className="text-sm text-gray-500">Push real-time alerts and announcements to all tenants.</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Broadcast
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center p-12 text-gray-500">
            <Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-base font-semibold text-gray-900">No broadcasts found</p>
            <p className="text-sm">Create a broadcast to notify your tenants.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Message</th>
                <th className="px-6 py-4 w-32">Status</th>
                <th className="px-6 py-4 w-48 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {broadcasts.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      {getTypeIcon(b.type)}
                      <div>
                        <p className="font-bold text-gray-900">{b.title}</p>
                        <p className="text-gray-500 mt-1">{b.message}</p>
                        <p className="text-xs text-gray-400 mt-2 font-mono">{new Date(b.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggle(b.id, b.is_active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${b.is_active ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${b.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="block text-[10px] text-gray-400 font-bold uppercase mt-1">
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-block"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">New Global Broadcast</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Title</label>
                <input name="title" required placeholder="e.g. System Maintenance" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Message</label>
                <textarea name="message" required rows={3} placeholder="The platform will be down for 5 mins at 3 AM." className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Type</label>
                <select name="type" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="INFO">Info (Blue)</option>
                  <option value="SUCCESS">Success (Green)</option>
                  <option value="WARNING">Warning (Yellow)</option>
                  <option value="ERROR">Error (Red)</option>
                </select>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl font-bold border border-gray-200 hover:bg-gray-100 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Broadcast</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
