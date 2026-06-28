import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reports/daily - Today's aggregated stats
export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Today's stats
    const todayOrders = await prisma.order.findMany({
      where: {
        status: 'PAID',
        paid_at: { gte: today, lt: tomorrow },
      },
    });

    const yesterdayOrders = await prisma.order.findMany({
      where: {
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
    const activeTables = await prisma.table.count({ where: { status: 'OCCUPIED' } });
    const totalTables = await prisma.table.count();

    // Cash/UPI/Card split
    const cashTotal = todayOrders.filter(o => o.payment_mode === 'CASH').reduce((s, o) => s + o.subtotal, 0);
    const upiTotal = todayOrders.filter(o => o.payment_mode === 'UPI').reduce((s, o) => s + o.subtotal, 0);
    const cardTotal = todayOrders.filter(o => o.payment_mode === 'CARD').reduce((s, o) => s + o.subtotal, 0);

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
