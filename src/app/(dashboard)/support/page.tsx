'use client';

import { useState, useEffect } from 'react';
import { LifeBuoy, Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      subject: formData.get('subject') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as string,
    };

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        toast.success('Support ticket created successfully');
        setShowModal(false);
        fetchTickets();
      } else {
        toast.error('Failed to create ticket');
      }
    } catch {
      toast.error('Failed to create ticket');
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
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Help & Support</h1>
            <p className="text-sm text-gray-500">Need help? Submit a ticket to our support team.</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <LifeBuoy className="empty-state-icon" />
            <p className="empty-state-title">No support tickets</p>
            <p className="empty-state-desc">You haven't submitted any support tickets yet.</p>
          </div>
        ) : (
          <table className="premium-table">
            <thead>
              <tr>
                <th>Ticket Info</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map(t => (
                <tr key={t.id}>
                  <td>
                    <p className="font-bold text-gray-900">{t.subject}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{t.description}</p>
                  </td>
                  <td>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      t.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' :
                      t.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                      t.priority === 'LOW' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'
                    }`}>{t.priority}</span>
                  </td>
                  <td>{getStatusBadge(t.status)}</td>
                  <td className="text-gray-500 font-mono text-xs">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-gray-900">New Support Ticket</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Subject</label>
                <input name="subject" required placeholder="e.g. Printer not connecting" className="premium-input" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Description</label>
                <textarea name="description" required rows={4} placeholder="Describe your issue in detail..." className="premium-input"></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Priority</label>
                <select name="priority" className="premium-select">
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent (System Down)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
