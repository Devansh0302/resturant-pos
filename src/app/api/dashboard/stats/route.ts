import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let restaurantId = (session.user as any).restaurantId;

    if (!restaurantId && (session.user as any).id) {
      const dbUser = await prisma.staff.findUnique({
        where: { id: (session.user as any).id },
        select: { restaurant_id: true },
      });
      restaurantId = dbUser?.restaurant_id;
    }

    if (!restaurantId) {
      return NextResponse.json({ error: "No restaurant" }, { status: 403 });
    }

    // Use IST (UTC+5:30) for date boundaries so reports match the Indian business day
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowUTC = Date.now();
    const nowIST = new Date(nowUTC + IST_OFFSET_MS);

    // Midnight today in IST, converted back to UTC for DB query
    const todayIST = new Date(nowIST);
    todayIST.setUTCHours(0, 0, 0, 0);
    const today = new Date(todayIST.getTime() - IST_OFFSET_MS);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayOrders = await prisma.order.findMany({
      where: { restaurant_id: restaurantId, status: "PAID", paid_at: { gte: today, lt: tomorrow } },
      select: { subtotal: true, cgst_amount: true, sgst_amount: true },
    });
    
    const yesterdayOrders = await prisma.order.findMany({
      where: { restaurant_id: restaurantId, status: "PAID", paid_at: { gte: yesterday, lt: today } },
      select: { subtotal: true },
    });
    
    const activeTables = await prisma.table.count({
      where: { restaurant_id: restaurantId, orders: { some: { status: "OPEN" } } },
    });
    
    const totalTables = await prisma.table.count({ where: { restaurant_id: restaurantId } });
    
    const recentOrders = await prisma.order.findMany({
      where: { restaurant_id: restaurantId, status: { in: ["PAID", "BILLED"] } },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        id: true,
        invoice_number: true,
        total_amount: true,
        subtotal: true,
        cgst_amount: true,
        sgst_amount: true,
        payment_mode: true,
        status: true,
        paid_at: true,
        created_at: true,
        order_type: true,
        table: { select: { table_number: true } },
        order_items: { select: { id: true } },
      },
    });
    
    const hourlyOrders = await prisma.order.findMany({
      where: {
        restaurant_id: restaurantId,
        status: "PAID",
        paid_at: { gte: today, lt: tomorrow },
      },
      select: { paid_at: true, subtotal: true },
    });

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const revenueChange =
      yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
        : "0";

    const todayGST = todayOrders.reduce((sum, o) => sum + o.cgst_amount + o.sgst_amount, 0);
    const avgOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

    const hourlyData = Array.from({ length: 18 }, (_, i) => ({
      hour: `${(i + 6).toString().padStart(2, "0")}:00`,
      revenue: 0,
      orders: 0,
    }));

    hourlyOrders.forEach((order) => {
      if (order.paid_at) {
        // Convert UTC timestamp to IST hour for display
        const istTime = new Date(order.paid_at.getTime() + IST_OFFSET_MS);
        const hour = istTime.getUTCHours();
        const idx = hour - 6;
        if (idx >= 0 && idx < 18) {
          hourlyData[idx].revenue += order.subtotal;
          hourlyData[idx].orders += 1;
        }
      }
    });

    return NextResponse.json({
      stats: {
        today_revenue: todayRevenue,
        revenue_change: revenueChange,
        orders_today: todayOrders.length,
        active_tables: activeTables,
        total_tables: totalTables,
        avg_order_value: avgOrderValue,
        total_gst: todayGST,
      },
      hourlyData,
      recentOrders: recentOrders.map((bill) => ({
        id: bill.id,
        invoice_number: bill.invoice_number,
        table_number: bill.table?.table_number || bill.order_type || "Unknown",
        date: bill.paid_at || bill.created_at,
        items_count: bill.order_items.length,
        subtotal: bill.subtotal,
        gst: bill.cgst_amount + bill.sgst_amount,
        total: bill.total_amount,
        payment_mode: bill.payment_mode,
        status: bill.status,
      })),
    });
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
