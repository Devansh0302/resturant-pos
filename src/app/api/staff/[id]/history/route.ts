import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const staffId = params.id;
    if (!staffId) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, name: true, role: true },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Fetch Today's stats
    const todayOrders = await prisma.order.findMany({
      where: {
        staff_id: staffId,
        created_at: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const todayOrdersCount = todayOrders.length;
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total_amount, 0);

    // Fetch History stats
    const allTimeOrders = await prisma.order.aggregate({
      where: { staff_id: staffId },
      _count: { id: true },
      _sum: { total_amount: true },
    });

    // Fetch Recent Orders (last 10)
    const recentOrders = await prisma.order.findMany({
      where: { staff_id: staffId },
      take: 10,
      orderBy: { created_at: 'desc' },
      include: {
        table: {
          select: { table_number: true },
        },
      },
    });

    return NextResponse.json({
      staff,
      today: {
        ordersCount: todayOrdersCount,
        revenue: todayRevenue,
      },
      history: {
        ordersCount: allTimeOrders._count.id || 0,
        revenue: allTimeOrders._sum.total_amount || 0,
      },
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        invoice_number: order.invoice_number,
        table_number: order.table.table_number,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
      })),
    });
  } catch (error) {
    console.error('GET /api/staff/[id]/history error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff history' }, { status: 500 });
  }
}
