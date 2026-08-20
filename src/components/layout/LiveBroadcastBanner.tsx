'use client';

import { useState, useEffect } from 'react';
import { Megaphone, X } from 'lucide-react';

export function LiveBroadcastBanner() {
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    const fetchBroadcasts = async () => {
      try {
        const res = await fetch('/api/super-admin/broadcasts');
        if (res.ok) {
          const data = await res.json();
          setBroadcasts(data);
        }
      } catch (err) {
        console.error('Failed to fetch live broadcasts:', err);
      }
    };

    fetchBroadcasts();
    const interval = setInterval(fetchBroadcasts, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss broadcasts after 10 seconds
  useEffect(() => {
    const timers = broadcasts.map(b => {
      if (!dismissed.includes(b.id)) {
        return setTimeout(() => {
          setDismissed(prev => {
            if (!prev.includes(b.id)) {
              return [...prev, b.id];
            }
            return prev;
          });
        }, 10000); // 10 seconds
      }
      return null;
    });

    return () => {
      timers.forEach(t => {
        if (t) clearTimeout(t);
      });
    };
  }, [broadcasts]); // only depend on broadcasts so we don't reset timers on dismiss


  const activeBroadcasts = broadcasts.filter(b => !dismissed.includes(b.id));

  if (activeBroadcasts.length === 0) return null;

  return (
    <div className="flex flex-col w-full z-[90]">
      {activeBroadcasts.map(b => {
        const bgColors: Record<string, string> = {
          'INFO': 'bg-blue-600',
          'SUCCESS': 'bg-emerald-600',
          'WARNING': 'bg-amber-600',
          'ERROR': 'bg-rose-600',
        };
        const bgColor = bgColors[b.type] || 'bg-indigo-600';

        return (
          <div key={b.id} className={`${bgColor} text-white px-4 py-3 flex items-center justify-between shadow-md relative`}>
            <div className="flex items-start gap-3">
              <Megaphone className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-90" />
              <div>
                <p className="text-sm font-bold">{b.title}</p>
                <p className="text-xs opacity-90 mt-0.5">{b.message}</p>
              </div>
            </div>
            <button
              onClick={() => setDismissed([...dismissed, b.id])}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
