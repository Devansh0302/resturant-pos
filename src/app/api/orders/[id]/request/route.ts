import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/orders/[id]/request - Waiter requests KOT or Bill
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    if (!action || !['KOT', 'BILL'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (action === 'KOT') dataToUpdate.kot_requested = true;
    if (action === 'BILL') dataToUpdate.bill_requested = true;

    const order = await prisma.order.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('POST /api/orders/[id]/request error:', error);
    return NextResponse.json({ error: 'Failed to request action' }, { status: 500 });
  }
}
