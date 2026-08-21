import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateGST } from '@/lib/gst';

// PATCH /api/orders/[id] - Update order items, notes, status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Cancel order
    if (body.status === 'CANCELLED') {
      const order = await prisma.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: { table: true },
      });

      if (order.table_id) {
        await prisma.table.update({
          where: { id: order.table_id },
          data: { status: 'AVAILABLE' },
        });
      }

      return NextResponse.json(order);
    }

    // Handle discount request status changes
    if (body.discount_request_status) {
      if (body.discount_request_status === 'APPROVED') {
        const orderRecord = await prisma.order.findUnique({ where: { id } });
        if (!orderRecord || !orderRecord.discount_request_percent) {
          return NextResponse.json({ error: 'No discount request found' }, { status: 400 });
        }
        
        const discount_amount = (orderRecord.subtotal * orderRecord.discount_request_percent) / 100;
        const discountedSubtotal = Math.max(0, orderRecord.subtotal - discount_amount);
        const restaurant = await prisma.restaurant.findUnique({ where: { id: orderRecord.restaurant_id } });
        const gst = calculateGST(discountedSubtotal, restaurant?.cgst_rate || 2.5, restaurant?.sgst_rate || 2.5);
        
        const order = await prisma.order.update({
          where: { id },
          data: {
            discount_amount,
            discount_request_status: 'APPROVED',
            cgst_amount: gst.cgst,
            sgst_amount: gst.sgst,
            total_amount: gst.total,
            round_off: gst.round_off,
          }
        });
        return NextResponse.json(order);
      } else if (body.discount_request_status === 'REJECTED') {
        const order = await prisma.order.update({
          where: { id },
          data: { discount_request_status: 'REJECTED' }
        });
        return NextResponse.json(order);
      }
    }
    
    // Handle new discount requests
    if (body.discount_request_percent !== undefined) {
      const order = await prisma.order.update({
        where: { id },
        data: {
          discount_request_percent: body.discount_request_percent,
          discount_request_status: 'PENDING',
        }
      });
      return NextResponse.json(order);
    }

    // Update items
    if (body.items) {
      // Fetch existing order to get restaurant_id and discount info
      const orderRecord = await prisma.order.findUnique({ 
        where: { id }, 
        select: { restaurant_id: true, discount_request_status: true, discount_request_percent: true } 
      });
      if (!orderRecord) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

      // Fetch existing to preserve status
      const existingItems = await prisma.orderItem.findMany({ where: { order_id: id } });
      const statusMap = new Map();
      existingItems.forEach(item => statusMap.set(item.menu_item_id, item.status));

      // Delete existing items
      await prisma.orderItem.deleteMany({ where: { order_id: id } });

      // Create new items
      await prisma.orderItem.createMany({
        data: body.items.map((i: any) => ({
          order_id: id,
          restaurant_id: orderRecord.restaurant_id,
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.quantity * i.unit_price,
          notes: i.notes || null,
          variant_name: i.variant_name || null,
          status: statusMap.get(i.menu_item_id) || 'PENDING'
        })),
      });

      // Recalculate totals
      const subtotal = body.items.reduce((sum: number, i: any) => sum + i.quantity * i.unit_price, 0);
      
      let discount_amount = body.discount_amount || 0;
      if (orderRecord && orderRecord.discount_request_status === 'APPROVED' && orderRecord.discount_request_percent) {
         discount_amount = (subtotal * orderRecord.discount_request_percent) / 100;
      }
      
      const discountedSubtotal = Math.max(0, subtotal - discount_amount);
      const restaurant = await prisma.restaurant.findFirst();
      const gst = calculateGST(discountedSubtotal, restaurant?.cgst_rate || 2.5, restaurant?.sgst_rate || 2.5);

      const order = await prisma.order.update({
        where: { id },
        data: {
          subtotal: subtotal,
          discount_amount: discount_amount,
          cgst_amount: gst.cgst,
          sgst_amount: gst.sgst,
          total_amount: gst.total,
          round_off: gst.round_off,
          guest_count: body.guest_count,
          notes: body.notes || null,
        },
        include: { order_items: true },
      });

      return NextResponse.json(order);
    }

    return NextResponse.json({ error: 'No valid update' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/orders/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

// GET /api/orders/[id] - Get order details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: true,
        staff: { select: { name: true, role: true } },
        order_items: {
          include: { menu_item: { select: { name: true, food_type: true } } },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
