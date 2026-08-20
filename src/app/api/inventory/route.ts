import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const restaurantId = (session.user as any).restaurantId;

    const materials = await prisma.rawMaterial.findMany({
      where: { restaurant_id: restaurantId, is_active: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(materials);
  } catch (error) {
    console.error('GET /api/inventory error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const restaurantId = (session.user as any).restaurantId;

    const body = await req.json();
    const { name, unit_type, current_stock, low_stock_alert } = body;

    if (!name || !unit_type) {
      return NextResponse.json({ error: 'Name and unit type are required' }, { status: 400 });
    }

    const material = await prisma.rawMaterial.create({
      data: {
        restaurant_id: restaurantId,
        name,
        unit_type,
        current_stock: Number(current_stock) || 0,
        low_stock_alert: Number(low_stock_alert) || 10,
      },
    });

    // Log the initial stock if greater than 0
    if (material.current_stock > 0) {
      await prisma.inventoryLog.create({
        data: {
          raw_material_id: material.id,
          action: 'SET',
          quantity: material.current_stock,
          previous_stock: 0,
          new_stock: material.current_stock,
          notes: 'Initial stock',
          performed_by: session.user.id,
        },
      });
    }

    return NextResponse.json(material);
  } catch (error) {
    console.error('POST /api/inventory error:', error);
    return NextResponse.json({ error: 'Failed to create raw material' }, { status: 500 });
  }
}
