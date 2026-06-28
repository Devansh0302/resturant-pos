import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch orders that have been sent to KOT (kot_requested = true)
    // and are not yet fully paid or cancelled
    const orders = await prisma.order.findMany({
      where: {
        kot_requested: true,
        status: {
          in: ['OPEN', 'PREPARING', 'READY'],
        },
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
