import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function checkSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') return null;
  return session;
}

export async function GET() {
  try {
    const session = await checkSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalTenants = await prisma.restaurant.count();
    const activeTenants = await prisma.restaurant.count({ where: { subscription_status: 'ACTIVE' } });
    const suspendedTenants = await prisma.restaurant.count({ where: { subscription_status: 'SUSPENDED' } });
    const totalOrders = await prisma.order.count({ where: { payment_status: 'PAID' } });
    
    const revenueResult = await prisma.order.aggregate({
      _sum: { total_amount: true },
      where: { payment_status: 'PAID' },
    });
    
    const expiringSoon = await prisma.restaurant.findMany({
      where: {
        subscription_status: 'ACTIVE',
        subscription_end_date: { lte: thirtyDaysFromNow, gte: now },
      },
      select: { id: true, name: true, subscription_end_date: true },
      orderBy: { subscription_end_date: 'asc' },
    });
    
    const recentLogs = await prisma.platformLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      include: { restaurant: { select: { name: true } } },
    });
    
    const topTenantsAggr = await prisma.order.groupBy({
      by: ['restaurant_id'],
      _sum: { total_amount: true },
      where: { payment_status: 'PAID' },
      orderBy: { _sum: { total_amount: 'desc' } },
      take: 5,
    });
    
    const recentOrders = await prisma.order.findMany({
      where: { payment_status: 'PAID', created_at: { gte: sevenDaysAgo } },
      select: { total_amount: true, created_at: true },
    });

    // Format Top Tenants
    const topTenantIds = topTenantsAggr.map(t => t.restaurant_id).filter(Boolean) as string[];
    const topTenantsData = await prisma.restaurant.findMany({ where: { id: { in: topTenantIds } }, select: { id: true, name: true, _count: { select: { orders: true } } } });
    const topTenants = topTenantsAggr.map(t => {
      const rest = topTenantsData.find(r => r.id === t.restaurant_id);
      return {
        id: t.restaurant_id,
        name: rest?.name || 'Unknown',
        orders: rest?._count.orders || 0,
        revenue: t._sum.total_amount || 0,
      };
    });

    // Format Chart Data
    const chartDataMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      chartDataMap[d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })] = 0;
    }
    
    recentOrders.forEach(order => {
      const dateStr = new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      if (chartDataMap[dateStr] !== undefined) {
        chartDataMap[dateStr] += (order.total_amount || 0);
      }
    });

    const chartData = Object.keys(chartDataMap).map(date => ({
      date,
      revenue: chartDataMap[date]
    }));

    return NextResponse.json({
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalOrders,
      totalRevenue: revenueResult._sum.total_amount || 0,
      expiringSoon,
      recentLogs,
      topTenants,
      chartData,
    });
  } catch (error) {
    console.error('GET /api/super-admin/stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
