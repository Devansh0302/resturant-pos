import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/menu - Returns all active items grouped by category
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      include: {
        menu_items: {
          where: { is_deleted: false },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            food_type: true,
            is_available: true,
            image_url: true,
            category_id: true,
          },
        },
      },
    });

    const result = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      items: cat.menu_items.map(item => ({
        ...item,
        category: { id: cat.id, name: cat.name },
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/menu error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}

// POST /api/menu - Create a new menu item (ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, category_id, food_type, price, description, is_available } = body;

    if (!name || !category_id || !price || price <= 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const item = await prisma.menuItem.create({
      data: {
        name,
        category_id,
        food_type: food_type || 'VEG',
        price: parseFloat(price),
        description: description || null,
        is_available: is_available !== false,
      },
      include: { category: true },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/menu error:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
