export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch orders that have been sent to KOT (kot_requested = true)
    // and are not yet fully paid or cancelled
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['OPEN', 'PREPARING', 'READY'],
        },
        OR: [
          { kot_requested: true },
          {
            kot_tickets: {
              some: {}
            }
          },
          {
            order_items: {
              some: {
                status: 'IN_KITCHEN'
              }
            }
          }
        ]
      },
      include: {
        table: true,
        staff: true,
        order_items: {
          include: {
            menu_item: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Failed to fetch KDS orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
