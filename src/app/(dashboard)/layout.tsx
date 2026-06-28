import { Sidebar } from '@/components/layout/sidebar';
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
    <div className="min-h-screen relative" style={{ backgroundColor: '#F9FAFB' }}>
      {daysRemaining >= 0 && daysRemaining <= 7 && (
        <SubscriptionWarningBanner daysRemaining={daysRemaining} />
      )}
      <Sidebar />
      <main
        className="min-h-screen"
        style={{ 
          marginLeft: '240px', 
          padding: '24px 32px'
        }}
      >
        <SubscriptionLock isExpired={isExpired}>
          {children}
        </SubscriptionLock>
      </main>
      <NotificationListener />
    </div>
  );
}
