'use client';

import { usePathname } from 'next/navigation';
import { SubscriptionExpiredScreen } from './SubscriptionExpiredScreen';

interface SubscriptionLockProps {
  isExpired: boolean;
  children: React.ReactNode;
}

export function SubscriptionLock({ isExpired, children }: SubscriptionLockProps) {
  const pathname = usePathname();

  // If subscription is expired and the user is NOT on the settings page, show the lock screen
  if (isExpired && !pathname?.startsWith('/settings')) {
    return <SubscriptionExpiredScreen />;
  }

  return <>{children}</>;
}
