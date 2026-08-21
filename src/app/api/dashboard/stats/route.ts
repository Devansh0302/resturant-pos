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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [todayOrders, yesterdayOrders, activeTables, totalTables, recentOrders, hourlyOrders] = await Promise.all([
      prisma.order.findMany({
        where: { restaurant_id: restaurantId, status: "PAID", paid_at: { gte: today, lt: tomorrow } },
        select: { subtotal: true, cgst_amount: true, sgst_amount: true },
      }),
      prisma.order.findMany({
        where: { restaurant_id: restaurantId, status: "PAID", paid_at: { gte: yesterday, lt: today } },
        select: { subtotal: true },
      }),
      prisma.table.count({
        where: { restaurant_id: restaurantId, orders: { some: { status: "OPEN" } } },
      }),
      prisma.table.count({ where: { restaurant_id: restaurantId } }),
      prisma.order.findMany({
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
      }),
      prisma.order.findMany({
        where: {
          restaurant_id: restaurantId,
          status: "PAID",
          paid_at: { gte: today, lt: tomorrow },
        },
        select: { paid_at: true, subtotal: true },
      }),
    ]);

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
        const hour = order.paid_at.getHours();
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
