import { Sidebar } from '@/components/layout/sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';
import { NotificationListener } from '@/components/layout/NotificationListener';

import { prisma } from '@/lib/prisma';
import { SubscriptionWarningBanner } from '@/components/layout/SubscriptionWarningBanner';
import { SubscriptionExpiredScreen } from '@/components/layout/SubscriptionExpiredScreen';
import { SubscriptionLock } from '@/components/layout/SubscriptionLock';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import { LiveBroadcastBanner } from '@/components/layout/LiveBroadcastBanner';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import QuickTour from '@/components/onboarding/QuickTour';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const userRestaurantId = (session?.user as any)?.restaurantId;
  const impersonatedBy = (session?.user as any)?.impersonatedBy;
  const impersonatedByName = (session?.user as any)?.impersonatedByName || 'Super Admin';
  const role = (session?.user as any)?.role;
  const hasSeenTour = (session?.user as any)?.has_seen_tour;

  let restaurant = null;
  try {
    if (userRestaurantId) {
      restaurant = await prisma.restaurant.findUnique({ where: { id: userRestaurantId } });
    }
  } catch (err) {
    console.error('Failed to fetch restaurant in layout (DB connection issue):', err);
  }
  const today = new Date();
  const endDate = restaurant?.subscription_end_date ? new Date(restaurant.subscription_end_date) : null;
  
  let daysRemaining = -1;
  let isExpired = false;
  
  if (endDate) {
    const diffTime = endDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isExpired = daysRemaining < 0 || restaurant?.subscription_status === 'EXPIRED' || restaurant?.subscription_status === 'SUSPENDED';
  }

  // Live broadcasts are now fetched dynamically on the client via LiveBroadcastBanner

  return (
    <div className="min-h-screen relative flex flex-col bg-background">
      {restaurant?.theme_color && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --color-primary: ${restaurant.theme_color};
            --color-accent: ${restaurant.theme_color};
            --color-ring: ${restaurant.theme_color};
          }
        `}} />
      )}
      {impersonatedBy && restaurant && (
        <ImpersonationBanner restaurantName={restaurant.name} impersonatorName={impersonatedByName} />
      )}
      <LiveBroadcastBanner />
      {daysRemaining >= 0 && daysRemaining <= 7 && !impersonatedBy && (
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
      {role === 'ADMIN' && <QuickTour initialHasSeenTour={hasSeenTour || false} />}
    </div>
  );
}
