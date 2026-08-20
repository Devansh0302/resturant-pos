import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/orders/[id]/payment - Confirm payment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { payment_mode } = body;

    if (!payment_mode) {
      return NextResponse.json({ error: 'Payment mode is required' }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: 'PAID',
        payment_mode,
        payment_status: 'PAID',
        paid_at: new Date(),
      },
    });

    if (order.table_id) {
      // Set primary table back to AVAILABLE
      await prisma.table.update({
        where: { id: order.table_id },
        data: { status: 'AVAILABLE' },
      });

      // Unmerge any secondary tables and set them back to AVAILABLE
      await prisma.table.updateMany({
        where: { merged_with_id: order.table_id },
        data: { status: 'AVAILABLE', merged_with_id: null },
      });
    }

    // Force Next.js to refresh these pages instead of showing cached data
    const { revalidatePath } = require('next/cache');
    revalidatePath('/dashboard');
    revalidatePath('/tables');
    revalidatePath('/reports');

    return NextResponse.json(order);
  } catch (error) {
    console.error('POST /api/orders/[id]/payment error:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}
