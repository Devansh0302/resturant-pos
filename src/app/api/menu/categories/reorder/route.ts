import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PUT /api/menu/categories/reorder - Bulk update category sort orders
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const restaurantId = (session.user as any).restaurantId;

    const body = await req.json();
    const { categories } = body; // Array of { id, sort_order }

    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Run updates in a transaction
    await prisma.$transaction(
      categories.map((cat: any) =>
        prisma.category.update({
          where: { id: cat.id, restaurant_id: restaurantId },
          data: { sort_order: cat.sort_order }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/menu/categories/reorder error:', error);
    return NextResponse.json({ error: 'Failed to reorder categories' }, { status: 500 });
  }
}
