import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get start and end of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await prisma.order.findMany({
      where: {
        created_at: {
          gte: today,
          lt: tomorrow,
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
        created_at: 'desc',
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Failed to fetch today orders history:', error);
    return NextResponse.json({ error: 'Failed to fetch orders history' }, { status: 500 });
  }
}
