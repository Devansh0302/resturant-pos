import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDailyStats, getHourlySales, getRecentBills } from '@/lib/services/dashboard';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/login');
  }
  
  let restaurantId = (session.user as any).restaurantId;
  
  // Fallback for stale sessions that might be missing the restaurantId
  if (!restaurantId && (session.user as any).id) {
    const { prisma } = await import('@/lib/prisma');
    const dbUser = await prisma.staff.findUnique({
      where: { id: (session.user as any).id },
      select: { restaurant_id: true }
    });
    if (dbUser?.restaurant_id) {
      restaurantId = dbUser.restaurant_id;
    }
  }

  if (!restaurantId) {
    redirect('/login');
  }

  // Fetch all data concurrently on the server
  const [stats, hourlyData, recentOrders] = await Promise.all([
    getDailyStats(restaurantId),
    getHourlySales(restaurantId),
    getRecentBills(restaurantId)
  ]);

  return <DashboardClient stats={stats} hourlyData={hourlyData} recentOrders={recentOrders} />;
}

