import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/restaurant - Get restaurant settings
export async function GET() {
  try {
    const restaurant = await prisma.restaurant.findFirst();
    return NextResponse.json(restaurant);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// PATCH /api/restaurant - Update restaurant settings (ADMIN only)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const restaurant = await prisma.restaurant.findFirst();

    if (!restaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        name: body.name,
        address: body.address,
        phone: body.phone,
        gstin: body.gstin,
        cgst_rate: body.cgst_rate ? parseFloat(body.cgst_rate) : undefined,
        sgst_rate: body.sgst_rate ? parseFloat(body.sgst_rate) : undefined,
        swiggy_enabled: body.swiggy_enabled !== undefined ? body.swiggy_enabled : undefined,
        swiggy_api_key: body.swiggy_api_key !== undefined ? body.swiggy_api_key : undefined,
        zomato_enabled: body.zomato_enabled !== undefined ? body.zomato_enabled : undefined,
        zomato_api_key: body.zomato_api_key !== undefined ? body.zomato_api_key : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
