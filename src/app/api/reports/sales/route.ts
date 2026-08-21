export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/sales - Hourly revenue data
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const restaurantId = (session.user as any).restaurantId;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Parse dates in IST (UTC+5:30) so "today" means Indian business day
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

    let startDate: Date;
    let endDate: Date;

    if (from) {
      // Parse the date string as IST midnight (start of day in India)
      startDate = new Date(new Date(from + 'T00:00:00.000Z').getTime() - IST_OFFSET_MS);
    } else {
      const nowIST = new Date(Date.now() + IST_OFFSET_MS);
      const midnightIST = new Date(nowIST);
      midnightIST.setUTCHours(0, 0, 0, 0);
      startDate = new Date(midnightIST.getTime() - IST_OFFSET_MS);
    }

    if (to) {
      // Parse the date string as IST end of day (23:59:59 IST)
      endDate = new Date(new Date(to + 'T23:59:59.999Z').getTime() - IST_OFFSET_MS);
    } else {
      endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
    }

    const orders = await prisma.order.findMany({
      where: {
        restaurant_id: restaurantId,
        status: 'PAID',
        paid_at: { gte: startDate, lte: endDate },
      },
      select: { 
        paid_at: true, 
        total_amount: true, 
        subtotal: true, 
        cgst_amount: true, 
        sgst_amount: true, 
        payment_mode: true,
        table_id: true,
        staff: {
          select: { name: true, role: true }
        }
      },
    });

    // Hourly breakdown (24 hours)
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      revenue: 0,
      orders: 0,
    }));

    orders.forEach(order => {
      if (order.paid_at) {
        // Convert UTC to IST for correct hour bucket
        const istTime = new Date(order.paid_at.getTime() + IST_OFFSET_MS);
        const hour = istTime.getUTCHours();
        const idx = hour;
        if (idx >= 0 && idx < 24) {
          hourlyData[idx].revenue += order.total_amount || 0;
          hourlyData[idx].orders += 1;
        }
      }
    });

    // Daily breakdown for date ranges
    const dailyMap = new Map<string, number>();
    orders.forEach(order => {
      if (order.paid_at) {
        const dateKey = order.paid_at.toISOString().split('T')[0];
        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + (order.total_amount || 0));
      }
    });

    const dailyData = Array.from(dailyMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Payment mode split
    const paymentSplit = { CASH: 0, UPI: 0, CARD: 0 };
    orders.forEach(order => {
      if (order.payment_mode) {
        paymentSplit[order.payment_mode as keyof typeof paymentSplit] += (order.total_amount || 0);
      }
    });

    // Top selling items
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          restaurant_id: restaurantId,
          status: 'PAID',
          paid_at: { gte: startDate, lte: endDate },
        },
      },
      include: { menu_item: { select: { name: true } } },
    });

    const itemSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    orderItems.forEach(oi => {
      const existing = itemSales.get(oi.menu_item_id) || { name: oi.menu_item.name, quantity: 0, revenue: 0 };
      existing.quantity += oi.quantity;
      existing.revenue += oi.total_price;
      itemSales.set(oi.menu_item_id, existing);
    });

    const topItems = Array.from(itemSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Staff Performance
    const staffStats = new Map<string, { name: string; role: string; tables: Set<string>; revenue: number; orders: number }>();
    
    orders.forEach(order => {
      const staffName = order.staff?.name || 'Unknown';
      const staffRole = order.staff?.role || 'UNKNOWN';
      const key = staffName; // Use name as key, or staff_id if we included it, but we only have name/role now. Let's group by name.
      const existing = staffStats.get(key) || { name: staffName, role: staffRole, tables: new Set<string>(), revenue: 0, orders: 0 };
      if (order.table_id) existing.tables.add(order.table_id);
      existing.revenue += order.total_amount;
      existing.orders += 1;
      staffStats.set(key, existing);
    });

    const staffPerformance = Array.from(staffStats.values()).map(s => ({
      name: s.name,
      role: s.role,
      tablesHandled: s.tables.size,
      ordersHandled: s.orders,
      revenue: s.revenue
    })).sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      hourly: hourlyData,
      daily: dailyData,
      payment_split: paymentSplit,
      top_items: topItems,
      staff_performance: staffPerformance,
      total_revenue: orders.reduce((s, o) => s + o.subtotal, 0),
      total_orders: orders.length,
      total_gst: orders.reduce((s, o) => s + o.cgst_amount + o.sgst_amount, 0),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 });
  }
}
