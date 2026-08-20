import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function checkSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const restaurantId = (await params).id;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { addons: true },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json(restaurant.addons);
  } catch (error) {
    console.error('GET /api/super-admin/restaurants/[id]/addons error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const restaurantId = (await params).id;
    const body = await req.json();
    const { addonIds } = body; // Array of strings (AddOn IDs)

    if (!Array.isArray(addonIds)) {
      return NextResponse.json({ error: 'addonIds must be an array' }, { status: 400 });
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        addons: {
          set: addonIds.map((id) => ({ id })),
        },
      },
      include: { addons: true },
    });

    return NextResponse.json(updatedRestaurant.addons);
  } catch (error) {
    console.error('PATCH /api/super-admin/restaurants/[id]/addons error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
