import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/notifications - Get active KOT and Bill requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role;

    if (role === 'WAITER') {
      const readyOrders = await prisma.order.findMany({
        where: {
          status: 'READY'
        },
        include: {
          table: true
        },
        orderBy: { updated_at: 'asc' }
      });

      const notifications = readyOrders.map(order => ({
        order_id: order.id,
        table_id: order.table_id || '',
        table_number: order.table?.table_number || (order.order_type === 'TAKEAWAY' ? 'Takeaway' : 'Online'),
        kot_requested: false,
        bill_requested: false,
        is_ready: true,
        guest_count: order.guest_count
      }));

      return NextResponse.json(notifications);
    } else {
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
        table_id: order.table_id || '',
        table_number: order.table?.table_number || (order.order_type === 'TAKEAWAY' ? 'Takeaway' : 'Online'),
        kot_requested: order.kot_requested,
        bill_requested: order.bill_requested,
        is_ready: false,
        guest_count: order.guest_count
      }));

      return NextResponse.json(notifications);
    }
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
