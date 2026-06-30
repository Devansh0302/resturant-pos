'use client';

import { Menu } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import Image from 'next/image';

export function MobileHeader() {
  const toggleMobileSidebar = useUIStore((state) => state.toggleMobileSidebar);

  return (
    <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}
        >
          <Image src="/spice-route-logo.png" alt="Spice Route" width={20} height={20} className="object-contain" />
        </div>
        <h1 className="font-semibold text-lg text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
          Spice Route
        </h1>
      </div>
      <button 
        onClick={toggleMobileSidebar}
        className="p-2 -mr-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:bg-gray-100 rounded-md transition-colors"
      >
        <Menu size={24} />
      </button>
    </header>
  );
}
