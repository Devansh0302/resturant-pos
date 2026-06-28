'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Grid3x3,
  PlusCircle,
  UtensilsCrossed,
  Receipt,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
  Clock,
  Package,
  Users,
  ClipboardCheck,
  Smartphone,
  TrendingUp
} from 'lucide-react';
import Image from 'next/image';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'CASHIER'] },
  { label: 'Tables', href: '/tables', icon: Grid3x3, roles: ['ADMIN', 'CASHIER', 'WAITER'] },
  { label: 'Menu', href: '/menu', icon: UtensilsCrossed, roles: ['ADMIN', 'CASHIER', 'WAITER'] },
  { label: 'Bills', href: '/bills', icon: Receipt, roles: ['ADMIN', 'CASHIER'] },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['ADMIN'] },
  { label: 'Staff', href: '/staff', icon: Users, roles: ['ADMIN'] },
  { label: 'Staff Performance', href: '/staff-performance', icon: TrendingUp, roles: ['ADMIN', 'CASHIER'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [integrationsEnabled, setIntegrationsEnabled] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const checkIntegrations = () => {
      fetch('/api/restaurant')
        .then(res => res.json())
        .then(data => {
          if (data && (data.swiggy_enabled || data.zomato_enabled)) {
            setIntegrationsEnabled(true);
          } else {
            setIntegrationsEnabled(false);
          }
        })
        .catch(console.error);
    };

    checkIntegrations();

    window.addEventListener('integrationsUpdated', checkIntegrations);
      
    return () => {
      clearInterval(timer);
      window.removeEventListener('integrationsUpdated', checkIntegrations);
    };
  }, []);

  const isAdmin = session?.user?.role === 'ADMIN';

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return { bg: '#10B98120', text: '#10B981' };
      case 'CASHIER': return { bg: '#F9731620', text: '#F97316' };
      case 'WAITER': return { bg: '#F3F4F6', text: '#4B5563' };
      default: return { bg: '#E5E7EB', text: '#6B7280' };
    }
  };

  const roleColors = getRoleBadgeColor(session?.user?.role || '');

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-50"
      style={{
        width: '240px',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #F3F4F6',
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Logo & Brand */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid #E5E7EB' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}
          >
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={28}
              height={28}
              className="rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<span style="color:white;font-size:14px;font-weight:700">SR</span>';
              }}
            />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ fontFamily: 'var(--font-heading)', color: '#1A1A1A' }}>
              Spice Route
            </h1>
            <p className="text-[10px] tracking-wider uppercase" style={{ color: '#6B7280' }}>
              Billing System
            </p>
          </div>
        </div>
      </div>

      {/* Staff Info */}
      {session?.user && (
        <div className="px-5 py-3" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>
            {session.user.name}
          </p>
          <span
            className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full"
            style={{
              backgroundColor: roleColors.bg,
              color: roleColors.text,
            }}
          >
            {session.user.role}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const userRole = session?.user?.role || 'WAITER';
          if (!item.roles.includes(userRole)) return null;

          // For simplicity, we just check startsWith, and for exact match we strip query params from href
          const hrefPath = item.href.split('?')[0];
          const isActive = pathname === hrefPath || (hrefPath !== '/' && pathname.startsWith(hrefPath + '/'));
          const isAdminItem = item.roles.length === 1 && item.roles[0] === 'ADMIN';

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group"
              style={{
                backgroundColor: isActive ? '#10B981' : 'transparent',
                color: isActive ? '#FFFFFF' : '#4B5563',
                boxShadow: isActive ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#E5E7EB50';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Dynamic Integrations Tab */}
        {integrationsEnabled && ['ADMIN', 'CASHIER'].includes(session?.user?.role || '') && (
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            <button
              onClick={() => router.push('/delivery')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group mt-4 border border-orange-200"
              style={{
                backgroundColor: pathname === '/delivery' ? '#FFF7ED' : 'transparent',
                color: pathname === '/delivery' ? '#EA580C' : '#EA580C',
                boxShadow: pathname === '/delivery' ? '0 2px 8px rgba(234, 88, 12, 0.1)' : 'none',
              }}
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: pathname === '/delivery' ? '#EA580C' : '#FFEDD5',
                  color: pathname === '/delivery' ? '#FFFFFF' : '#EA580C',
                }}
              >
                <Smartphone className="w-4 h-4" />
              </div>
              <span className="flex-1 text-left relative">
                Online Orders
                <span className="absolute -top-1 -right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
              </span>
            </button>
          </motion.div>
        )}
      </nav>

      {/* Bottom: Clock & Logout */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid #E5E7EB' }}>
        {/* Live Clock */}
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-3.5 h-3.5" style={{ color: '#6B7280' }} />
          <span
            className="text-xs tabular-nums"
            style={{ fontFamily: 'var(--font-mono)', color: '#6B7280' }}
          >
            {currentTime ? currentTime.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            }) : '--:--:-- --'}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer"
          style={{ color: '#EF4444' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#FEF2F2';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
