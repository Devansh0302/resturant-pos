import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reports/sales - Hourly revenue data
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const startDate = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0));
    const endDate = to ? new Date(to + 'T23:59:59.999Z') : new Date(new Date().setHours(23, 59, 59, 999));

    const orders = await prisma.order.findMany({
      where: {
        status: 'PAID',
        paid_at: { gte: startDate, lte: endDate },
      },
      select: { paid_at: true, total_amount: true, subtotal: true, cgst_amount: true, sgst_amount: true, payment_mode: true },
    });

    // Hourly breakdown (6AM to 11PM)
    const hourlyData = Array.from({ length: 18 }, (_, i) => ({
      hour: `${(i + 6).toString().padStart(2, '0')}:00`,
      revenue: 0,
      orders: 0,
    }));

    orders.forEach(order => {
      if (order.paid_at) {
        const hour = order.paid_at.getHours();
        const idx = hour - 6;
        if (idx >= 0 && idx < 18) {
          hourlyData[idx].revenue += order.subtotal;
          hourlyData[idx].orders += 1;
        }
      }
    });

    // Daily breakdown for date ranges
    const dailyMap = new Map<string, number>();
    orders.forEach(order => {
      if (order.paid_at) {
        const dateKey = order.paid_at.toISOString().split('T')[0];
        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + order.subtotal);
      }
    });

    const dailyData = Array.from(dailyMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Payment mode split
    const paymentSplit = { CASH: 0, UPI: 0, CARD: 0 };
    orders.forEach(order => {
      if (order.payment_mode) {
        paymentSplit[order.payment_mode as keyof typeof paymentSplit] += order.subtotal;
      }
    });

    // Top selling items
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
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

    return NextResponse.json({
      hourly: hourlyData,
      daily: dailyData,
      payment_split: paymentSplit,
      top_items: topItems,
      total_revenue: orders.reduce((s, o) => s + o.subtotal, 0),
      total_orders: orders.length,
      total_gst: orders.reduce((s, o) => s + o.cgst_amount + o.sgst_amount, 0),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 });
  }
}
