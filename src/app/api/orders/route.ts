export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateInvoiceNumber } from '@/lib/invoice';
import { calculateGST } from '@/lib/gst';

// POST /api/orders - Create a new order
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const restaurantId = (session.user as any).restaurantId;

    const body = await req.json();
    const { table_id, staff_id, guest_count, items, notes } = body;

    if (!staff_id) {
      return NextResponse.json({ error: 'Missing staff_id' }, { status: 400 });
    }

    let orderType = 'DINE_IN';
    let dbTableId: string | null = table_id;

    if (table_id === 'takeaway') {
      orderType = 'TAKEAWAY';
      dbTableId = null;
    } else if (table_id === 'online') {
      orderType = 'ONLINE';
      dbTableId = null;
    } else if (!table_id) {
      return NextResponse.json({ error: 'Missing table_id' }, { status: 400 });
    }

    const invoice_number = await generateInvoiceNumber();

    // Calculate totals
    const subtotal = items?.reduce((sum: number, i: any) => sum + i.quantity * i.unit_price, 0) || 0;
    const discount_amount = body.discount_amount || 0;
    const discountedSubtotal = Math.max(0, subtotal - discount_amount);
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    const gst = calculateGST(discountedSubtotal, restaurant?.cgst_rate || 2.5, restaurant?.sgst_rate || 2.5);

    const order = await prisma.order.create({
      data: {
        restaurant_id: restaurantId,
        table_id: dbTableId,
        staff_id,
        order_type: orderType as any,
        invoice_number,
        guest_count: guest_count || 1,
        status: 'OPEN',
        subtotal: subtotal,
        discount_amount: discount_amount,
        cgst_amount: gst.cgst,
        sgst_amount: gst.sgst,
        total_amount: gst.total,
        round_off: gst.round_off,
        notes: notes || null,
        order_items: items?.length
          ? {
              create: items.map((i: any) => ({
                restaurant_id: restaurantId,
                menu_item_id: i.menu_item_id,
                quantity: i.quantity,
                unit_price: i.unit_price,
                total_price: i.quantity * i.unit_price,
                notes: i.notes,
                variant_name: i.variant_name || null,
              })),
            }
          : undefined,
      },
      include: { order_items: true },
    });

    // Set table to OCCUPIED only for DINE_IN
    if (dbTableId) {
      await prisma.table.update({
        where: { id: dbTableId },
        data: { status: 'OCCUPIED' },
      });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
