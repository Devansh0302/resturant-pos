import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/menu/categories - Create a new category
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const restaurantId = (session.user as any).restaurantId;

    const body = await req.json();
    const { name, names, sort_order } = body;

    if (names && Array.isArray(names) && names.length > 0) {
      const data = names.map((n: string, i: number) => ({
        restaurant_id: restaurantId,
        name: n,
        sort_order: (sort_order || 0) + i,
      }));
      await prisma.category.createMany({ data });
      return NextResponse.json({ success: true }, { status: 201 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Name or names array is required' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        restaurant_id: restaurantId,
        name,
        sort_order: sort_order || 0,
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('POST /api/menu/categories error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
