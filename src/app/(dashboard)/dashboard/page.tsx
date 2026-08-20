import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDailyStats, getHourlySales, getRecentBills } from '@/lib/services/dashboard';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  // Since middleware protects this route, we know user is either ADMIN or CASHIER
  if (!session || !session.user || !(session.user as any).restaurantId) {
    redirect('/login');
  }
  
  const restaurantId = (session.user as any).restaurantId;

  // Fetch all data concurrently on the server
  const [stats, hourlyData, recentOrders] = await Promise.all([
    getDailyStats(restaurantId),
    getHourlySales(restaurantId),
    getRecentBills(restaurantId)
  ]);

  return <DashboardClient stats={stats} hourlyData={hourlyData} recentOrders={recentOrders} />;
}

