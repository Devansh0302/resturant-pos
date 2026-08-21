import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/daily - Today's aggregated stats
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const restaurantId = (session.user as any).restaurantId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Today's stats
    const todayOrders = await prisma.order.findMany({
      where: {
        restaurant_id: restaurantId,
        status: 'PAID',
        paid_at: { gte: today, lt: tomorrow },
      },
    });

    const yesterdayOrders = await prisma.order.findMany({
      where: {
        restaurant_id: restaurantId,
        status: 'PAID',
        paid_at: { gte: yesterday, lt: today },
      },
    });

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const revenueChange = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
      : '0';

    const todayGST = todayOrders.reduce((sum, o) => sum + o.cgst_amount + o.sgst_amount, 0);
    const avgOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

    // Active tables
    const activeTables = await prisma.table.count({
      where: {
        restaurant_id: restaurantId,
        orders: {
          some: { status: 'OPEN' }
        }
      }
    });
    const totalTables = await prisma.table.count({
      where: { restaurant_id: restaurantId }
    });

    // Cash/UPI/Card split
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;
    todayOrders.forEach(o => {
      if (o.payment_mode === 'SPLIT' && o.split_payments) {
        const splits = o.split_payments as { CASH?: number, UPI?: number, CARD?: number };
        cashTotal += splits.CASH || 0;
        upiTotal += splits.UPI || 0;
        cardTotal += splits.CARD || 0;
      } else {
        if (o.payment_mode === 'CASH') cashTotal += o.total_amount;
        if (o.payment_mode === 'UPI') upiTotal += o.total_amount;
        if (o.payment_mode === 'CARD') cardTotal += o.total_amount;
      }
    });

    return NextResponse.json({
      today_revenue: todayRevenue,
      revenue_change: revenueChange,
      orders_today: todayOrders.length,
      active_tables: activeTables,
      total_tables: totalTables,
      avg_order_value: avgOrderValue,
      total_gst: todayGST,
      cash_total: cashTotal,
      upi_total: upiTotal,
      card_total: cardTotal,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}
