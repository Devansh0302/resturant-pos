import { Sidebar } from '@/components/layout/sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';
import { NotificationListener } from '@/components/layout/NotificationListener';

import { prisma } from '@/lib/prisma';
import { SubscriptionWarningBanner } from '@/components/layout/SubscriptionWarningBanner';
import { SubscriptionExpiredScreen } from '@/components/layout/SubscriptionExpiredScreen';
import { SubscriptionLock } from '@/components/layout/SubscriptionLock';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const restaurant = await prisma.restaurant.findFirst();
  const today = new Date();
  const endDate = restaurant?.subscription_end_date ? new Date(restaurant.subscription_end_date) : null;
  
  let daysRemaining = -1;
  let isExpired = false;
  
  if (endDate) {
    const diffTime = endDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isExpired = daysRemaining < 0 || restaurant?.subscription_status === 'EXPIRED';
  }

  return (
    <div className="min-h-screen relative flex flex-col" style={{ backgroundColor: '#F9FAFB' }}>
      {daysRemaining >= 0 && daysRemaining <= 7 && (
        <SubscriptionWarningBanner daysRemaining={daysRemaining} />
      )}
      <MobileHeader />
      <Sidebar />
      <main
        className="flex-1 min-h-screen transition-all duration-300 md:ml-[240px] p-4 sm:p-6 md:p-8 w-full md:w-auto"
      >
        <SubscriptionLock isExpired={isExpired}>
          {children}
        </SubscriptionLock>
      </main>
      <NotificationListener />
    </div>
  );
}
