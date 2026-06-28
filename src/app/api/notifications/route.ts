import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/notifications - Get active KOT and Bill requests
export async function GET() {
  try {
    const ordersWithRequests = await prisma.order.findMany({
      where: {
        status: 'OPEN',
        OR: [
          { kot_requested: true },
          { bill_requested: true }
        ]
      },
      include: {
        table: true
      },
      orderBy: { updated_at: 'asc' }
    });

    const notifications = ordersWithRequests.map(order => ({
      order_id: order.id,
      table_id: order.table_id,
      table_number: order.table.table_number,
      kot_requested: order.kot_requested,
      bill_requested: order.bill_requested,
      guest_count: order.guest_count
    }));

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
