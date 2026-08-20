'use client';

import { signOut } from 'next-auth/react';
import { AlertTriangle } from 'lucide-react';

export function ImpersonationBanner({ restaurantName, impersonatorName }: { restaurantName: string, impersonatorName: string }) {
  return (
    <div className="bg-rose-600 text-white px-4 py-2.5 flex items-center justify-between text-sm font-bold z-[100] sticky top-0 shadow-md">
       <div className="flex items-center gap-2.5">
         <AlertTriangle className="w-5 h-5 animate-pulse" />
         <span>⚠️ SECURITY AUDIT ACTIVE: {impersonatorName} is impersonating {restaurantName}. All actions are logged.</span>
       </div>
       <button 
         onClick={() => signOut({ redirect: false }).then(() => { window.location.href = window.location.origin + '/super-admin'; })} 
         className="px-4 py-1.5 bg-white text-rose-700 rounded-lg text-xs hover:bg-rose-50 transition-colors cursor-pointer shadow-sm border border-transparent"
       >
         End Impersonation (Secure Logout)
       </button>
    </div>
  )
}
