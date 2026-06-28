import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateGST } from '@/lib/gst';

// POST /api/orders/[id]/bill - Generate final bill
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { order_items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Recalculate final GST
    const subtotal = order.order_items.reduce((sum, item) => sum + item.total_price, 0);
    const restaurant = await prisma.restaurant.findFirst();
    const gst = calculateGST(subtotal, restaurant?.cgst_rate || 2.5, restaurant?.sgst_rate || 2.5);

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: 'BILLED',
        subtotal: gst.subtotal,
        cgst_amount: gst.cgst,
        sgst_amount: gst.sgst,
        total_amount: gst.total,
        bill_requested: false,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('POST /api/orders/[id]/bill error:', error);
    return NextResponse.json({ error: 'Failed to generate bill' }, { status: 500 });
  }
}
