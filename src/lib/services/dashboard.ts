import { prisma } from '@/lib/prisma';

export async function getDailyStats(restaurantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [todayOrders, yesterdayOrders, activeTables, totalTables] = await Promise.all([
    prisma.order.findMany({
      where: { restaurant_id: restaurantId, status: 'PAID', paid_at: { gte: today, lt: tomorrow } },
    }),
    prisma.order.findMany({
      where: { restaurant_id: restaurantId, status: 'PAID', paid_at: { gte: yesterday, lt: today } },
    }),
    prisma.table.count({ 
      where: { 
        restaurant_id: restaurantId, 
        orders: { some: { status: 'OPEN' } } 
      } 
    }),
    prisma.table.count({ where: { restaurant_id: restaurantId } }),
  ]);

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const revenueChange = yesterdayRevenue > 0
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
    : '0';

  const todayGST = todayOrders.reduce((sum, o) => sum + o.cgst_amount + o.sgst_amount, 0);
  const avgOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

  return {
    today_revenue: todayRevenue,
    revenue_change: revenueChange,
    orders_today: todayOrders.length,
    active_tables: activeTables,
    total_tables: totalTables,
    avg_order_value: avgOrderValue,
    total_gst: todayGST,
  };
}

export async function getHourlySales(restaurantId: string) {
  const startDate = new Date(new Date().setHours(0, 0, 0, 0));
  const endDate = new Date(new Date().setHours(23, 59, 59, 999));

  const orders = await prisma.order.findMany({
    where: {
      restaurant_id: restaurantId,
      status: 'PAID',
      paid_at: { gte: startDate, lte: endDate },
    },
    select: { paid_at: true, subtotal: true },
  });

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

  return hourlyData;
}

export async function getRecentBills(restaurantId: string) {
  const bills = await prisma.order.findMany({
    where: { restaurant_id: restaurantId, status: { in: ['PAID', 'BILLED'] } },
    orderBy: { created_at: 'desc' },
    take: 10,
    include: {
      table: { select: { table_number: true } },
      staff: { select: { name: true } },
      order_items: { select: { id: true } },
    },
  });

  return bills.map(bill => ({
    id: bill.id,
    invoice_number: bill.invoice_number,
    table_number: bill.table?.table_number || bill.order_type || 'Unknown',
    date: bill.paid_at || bill.created_at,
    items_count: bill.order_items.length,
    subtotal: bill.subtotal,
    gst: bill.cgst_amount + bill.sgst_amount,
    total: bill.total_amount,
    payment_mode: bill.payment_mode,
    status: bill.status,
  }));
}
