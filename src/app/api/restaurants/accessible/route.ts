import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessibleIds = (session.user as any).accessible_restaurant_ids || [];
    const currentRestaurantId = (session.user as any).restaurantId;

    // Ensure the current restaurant is always in the list
    const allIds = Array.from(new Set([...accessibleIds, currentRestaurantId].filter(Boolean)));

    if (allIds.length === 0) {
      return NextResponse.json([]);
    }

    const restaurants = await prisma.restaurant.findMany({
      where: {
        id: { in: allIds },
      },
      select: {
        id: true,
        name: true,
        address: true,
      },
    });

    return NextResponse.json(restaurants);
  } catch (error) {
    console.error('GET /api/restaurants/accessible error:', error);
    return NextResponse.json({ error: 'Failed to fetch accessible restaurants' }, { status: 500 });
  }
}
