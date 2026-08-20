'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Search, Filter } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const fetchLogs = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const url = filterAction ? `/api/super-admin/logs?action=${filterAction}` : '/api/super-admin/logs';
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data);
    } catch {
      console.error('Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  }, [filterAction]);

  useEffect(() => {
    fetchLogs(true);
    const interval = setInterval(() => fetchLogs(false), 15000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const filtered = logs.filter(l =>
    l.description?.toLowerCase().includes(search.toLowerCase()) ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.restaurant?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const actionTypes = [...new Set(logs.map(l => l.action))];

  const colorMap: Record<string, { color: string; bg: string }> = {
    'TENANT_PROVISIONED': { color: 'text-emerald-700', bg: 'bg-emerald-50' },
    'TENANT_UPDATED': { color: 'text-indigo-700', bg: 'bg-indigo-50' },
    'TENANT_DELETED': { color: 'text-rose-700', bg: 'bg-rose-50' },
    'PAYMENT_RECORDED': { color: 'text-blue-700', bg: 'bg-blue-50' },
    'SETTINGS_UPDATED': { color: 'text-gray-700', bg: 'bg-gray-100' },
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Audit Logs</h1>
        <p className="text-sm text-gray-500">System-wide audit trail of all platform activities.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50 gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setIsLoading(true); }}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-indigo-500 shadow-sm">
              <option value="">All Actions</option>
              {actionTypes.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
            <span className="text-xs font-mono text-gray-500 font-medium">{filtered.length} entries</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : filtered.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filtered.map((log) => {
              const c = colorMap[log.action] || { color: 'text-gray-700', bg: 'bg-gray-100' };
              return (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${c.bg} ${c.color} mt-0.5`}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${c.bg} ${c.color}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      {log.restaurant?.name && (
                        <span className="text-xs text-gray-500 font-medium">• {log.restaurant.name}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{log.description}</p>
                    <span className="text-[10px] text-gray-400 font-mono mt-1 block">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500 text-sm">
            No audit logs found. Actions like provisioning tenants, recording payments, and changing settings will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
