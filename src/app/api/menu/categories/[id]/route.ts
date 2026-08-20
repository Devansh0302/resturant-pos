import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PATCH /api/menu/categories/[id] - Update a category
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const restaurantId = (session.user as any).restaurantId;
    const { id } = await params;

    const body = await req.json();
    const { name, sort_order } = body;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category || category.restaurant_id !== restaurantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(sort_order !== undefined && { sort_order }),
      }
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('PATCH /api/menu/categories/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}
