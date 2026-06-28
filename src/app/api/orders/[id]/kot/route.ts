import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/orders/[id]/kot - Generate KOT ticket
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        order_items: {
          where: { status: 'PENDING' },
          include: { menu_item: { select: { name: true, food_type: true } } },
        },
        table: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const pendingItems = order.order_items;
    if (pendingItems.length === 0) {
      return NextResponse.json({ message: 'No pending items for KOT' }, { status: 200 });
    }

    // Count existing KOTs for this order
    const kotCount = await prisma.kOTTicket.count({ where: { order_id: id } });
    const kot_number = `KOT-${(kotCount + 1).toString().padStart(2, '0')}`;

    // Create KOT ticket
    const kot = await prisma.kOTTicket.create({
      data: {
        order_id: id,
        kot_number,
        items: JSON.stringify(pendingItems.map(item => ({
          name: item.menu_item.name,
          quantity: item.quantity,
          food_type: item.menu_item.food_type,
          notes: item.notes,
        }))),
      },
    });

    // Update item statuses to IN_KITCHEN
    await prisma.orderItem.updateMany({
      where: { order_id: id, status: 'PENDING' },
      data: { status: 'IN_KITCHEN' },
    });

    // Clear KOT requested flag
    await prisma.order.update({
      where: { id },
      data: { kot_requested: false }
    });

    return NextResponse.json({ kot, table: order.table.table_number });
  } catch (error) {
    console.error('POST /api/orders/[id]/kot error:', error);
    return NextResponse.json({ error: 'Failed to generate KOT' }, { status: 500 });
  }
}
