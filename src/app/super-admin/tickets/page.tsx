'use client';

import { useState, useEffect } from 'react';
import { LifeBuoy, Clock, CheckCircle2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/super-admin/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/super-admin/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Ticket marked as ${newStatus}`);
        fetchTickets();
      }
    } catch {
      toast.error('Failed to update ticket');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return <span className="badge badge-orange"><Clock className="w-3 h-3" /> Open</span>;
      case 'IN_PROGRESS': return <span className="badge badge-blue"><Clock className="w-3 h-3" /> In Progress</span>;
      case 'RESOLVED': return <span className="badge badge-emerald"><CheckCircle2 className="w-3 h-3" /> Resolved</span>;
      case 'CLOSED': return <span className="badge badge-gray"><CheckCircle2 className="w-3 h-3" /> Closed</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Help Desk</h1>
            <p className="text-sm text-gray-500">Manage support tickets from all tenants.</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : tickets.length === 0 ? (
          <div className="text-center p-12 text-gray-500">
            <LifeBuoy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-base font-semibold text-gray-900">Inbox Zero</p>
            <p className="text-sm">There are no open support tickets.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Tenant</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{t.restaurant?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{new Date(t.created_at).toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="font-bold text-gray-900">{t.subject}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      t.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' :
                      t.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                      t.priority === 'LOW' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'
                    }`}>{t.priority}</span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(t.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <select
                      disabled={updatingId === t.id}
                      value={t.status}
                      onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500 bg-white cursor-pointer"
                    >
                      <option value="OPEN">Mark Open</option>
                      <option value="IN_PROGRESS">Mark In Progress</option>
                      <option value="RESOLVED">Mark Resolved</option>
                      <option value="CLOSED">Mark Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
