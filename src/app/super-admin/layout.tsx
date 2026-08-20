'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, CreditCard, Settings, ScrollText, LogOut, Building2, Search, Bell, Megaphone, Activity, Receipt, LifeBuoy } from 'lucide-react';

import Link from 'next/link';
import { toast } from 'sonner';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);

  const [fakeNotifications, setFakeNotifications] = useState([
    { id: 1, text: "Ocean Grill requested Zomato Integration", time: "10 mins ago" },
    { id: 2, text: "New Tenant: 'Spice Route' joined", time: "1 hour ago" },
    { id: 3, text: "Server health check passed", time: "2 hours ago" },
  ]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
  }, [status, session, router]);

  if (status === 'loading' || !session || session.user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, href: '/super-admin' },
    { label: 'Tenants', icon: Building2, href: '/super-admin/restaurants' },
    { label: 'Help Desk', icon: LifeBuoy, href: '/super-admin/tickets' },
    { label: 'Broadcasts', icon: Megaphone, href: '/super-admin/broadcasts' },
    { label: 'Billing & Subscriptions', icon: CreditCard, href: '/super-admin/billing' },
    { label: 'Audit Logs', icon: ScrollText, href: '/super-admin/logs' },
    { label: 'Platform Settings', icon: Settings, href: '/super-admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col relative z-20 shadow-sm">
        <div className="p-6">
          <div className="flex flex-col items-center justify-center mb-1 py-2">
            <img src="/logo-premium.png" alt="NXTDINE" className="h-16 w-auto object-contain mb-2" />
            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase text-center">Super Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-3">Management</div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 border border-gray-100 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
              {session.user.name?.[0] || 'A'}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-bold text-gray-900 truncate">{session.user.name}</p>
              <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ redirect: false }).then(() => { window.location.href = window.location.origin + '/login'; })}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-gray-200 bg-white/80 backdrop-blur-md flex items-center justify-end px-8 z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {fakeNotifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                    {fakeNotifications.length > 0 && (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{fakeNotifications.length} New</span>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {fakeNotifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">No new notifications</div>
                    ) : (
                      fakeNotifications.map(n => (
                        <div key={n.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                          <p className="text-sm text-gray-800">{n.text}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 text-center border-t border-gray-100">
                    {fakeNotifications.length > 0 && (
                      <button 
                        onClick={() => {
                          setFakeNotifications([]);
                          toast.success('All notifications marked as read');
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="text-sm text-gray-500">
              Environment: <span className="text-emerald-700 font-mono text-xs bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded ml-1">PRODUCTION</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
