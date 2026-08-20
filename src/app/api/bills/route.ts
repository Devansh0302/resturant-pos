import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/bills - Get all paid bills
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const restaurantId = (session.user as any).restaurantId;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = {
      restaurant_id: restaurantId,
      status: { in: ['PAID', 'BILLED'] },
    };

    if (search) {
      where.invoice_number = { endsWith: search, mode: 'insensitive' };
    }

    if (from || to) {
      where.paid_at = {};
      if (from) where.paid_at.gte = new Date(from);
      if (to) where.paid_at.lte = new Date(to + 'T23:59:59.999Z');
    }

    const bills = await prisma.order.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        table: { select: { table_number: true } },
        staff: { select: { name: true } },
        order_items: { select: { id: true } },
      },
    });

    const result = bills.map(bill => ({
      id: bill.id,
      invoice_number: bill.invoice_number,
      table_number: bill.table?.table_number || bill.order_type || 'Unknown',
      date: bill.paid_at || bill.created_at,
      items_count: bill.order_items.length,
      subtotal: bill.subtotal,
      gst: bill.cgst_amount + bill.sgst_amount,
      total: bill.total_amount,
      payment_mode: bill.payment_mode,
      staff_name: bill.staff?.name || 'Unknown',
      status: bill.status,
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
  }
}
