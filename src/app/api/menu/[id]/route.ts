import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PATCH /api/menu/[id] - Update price, availability, or soft-delete (ADMIN only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'WAITER', 'CASHIER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isAdmin = session.user.role === 'ADMIN';

    const { id } = await params;
    const body = await req.json();

    // Soft delete
    if (body.is_deleted === true) {
      if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const item = await prisma.menuItem.update({
        where: { id },
        data: { is_deleted: true },
      });
      return NextResponse.json(item);
    }

    // Price update - create price log
    if (body.price !== undefined) {
      if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const currentItem = await prisma.menuItem.findUnique({ where: { id } });
      if (!currentItem) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      // Log the price change
      await prisma.priceLog.create({
        data: {
          menu_item_id: id,
          old_price: currentItem.price,
          new_price: parseFloat(body.price),
          changed_by: session.user.name,
        },
      });

      const updated = await prisma.menuItem.update({
        where: { id },
        data: { price: parseFloat(body.price) },
        include: { category: true },
      });

      return NextResponse.json(updated);
    }

    // Availability toggle
    if (body.is_available !== undefined) {
      const updated = await prisma.menuItem.update({
        where: { id },
        data: { is_available: body.is_available },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'No valid update field provided' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/menu/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}
