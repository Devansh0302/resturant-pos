'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'var(--font-sans)',
          },
          className: 'rounded-lg',
        }}
        richColors
        closeButton
      />
    </SessionProvider>
  );
}
