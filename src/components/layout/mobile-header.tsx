'use client';

import { Menu } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import Image from 'next/image';

export function MobileHeader() {
  const toggleMobileSidebar = useUIStore((state) => state.toggleMobileSidebar);

  return (
    <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center">
        <img src="/logo-premium.png" alt="NXTDINE" className="h-8 w-auto object-contain" />
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
