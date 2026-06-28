import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const { action } = await req.json();

    let dataToUpdate: any = {};

    if (action === 'ACCEPT') {
      dataToUpdate = {
        status: 'PREPARING',
        prep_start_time: new Date(),
      };
    } else if (action === 'READY') {
      dataToUpdate = {
        status: 'READY',
        prep_end_time: new Date(),
      };
    } else if (action === 'FINISH') {
      // Just mark as OPEN for the waiter to bill, or leave it as READY but remove from KDS
      // Usually KDS removes READY items when picked up, or we can use a status 'SERVED'
      dataToUpdate = {
        status: 'SERVED',
      };
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: dataToUpdate,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Failed to update KDS order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
