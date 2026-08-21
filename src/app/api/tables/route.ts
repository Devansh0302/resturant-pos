export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/tables - Returns all tables with active order info
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const restaurantId = (session.user as any).restaurantId;

    const tables = await prisma.table.findMany({
      where: { restaurant_id: restaurantId, merged_with_id: null },
      orderBy: { table_number: 'asc' },
      include: {
        merged_tables: true,
        orders: {
          where: { status: 'OPEN' },
          take: 1,
          orderBy: { created_at: 'desc' },
          include: {
            staff: {
              select: { id: true, name: true },
            },
            order_items: {
              include: {
                menu_item: {
                  select: { name: true, food_type: true },
                },
              },
            },
          },
        },
      },
    });

    const result = tables.map(table => {
      const activeOrder = table.orders[0] || null;
      
      let displayName = table.table_number;
      let totalCapacity = table.capacity;
      
      if (table.merged_tables && table.merged_tables.length > 0) {
        displayName = [table.table_number, ...table.merged_tables.map(t => t.table_number)].join(' + ');
        totalCapacity += table.merged_tables.reduce((sum, t) => sum + t.capacity, 0);
      }

      return {
        id: table.id,
        table_number: displayName,
        original_table_number: table.table_number,
        capacity: totalCapacity,
        area: table.area,
        status: activeOrder ? 'OCCUPIED' : 'AVAILABLE',
        is_merged: table.merged_tables.length > 0,
        activeOrder: activeOrder
          ? {
              id: activeOrder.id,
              guest_count: activeOrder.guest_count,
              total_amount: activeOrder.total_amount,
              created_at: activeOrder.created_at.toISOString(),
              item_count: activeOrder.order_items.length,
              staff: activeOrder.staff ? {
                id: activeOrder.staff.id,
                name: activeOrder.staff.name,
              } : undefined,
              order_items: activeOrder.order_items.map(oi => ({
                id: oi.id,
                menu_item_id: oi.menu_item_id,
                quantity: oi.quantity,
                unit_price: oi.unit_price,
                total_price: oi.total_price,
                notes: oi.notes,
                variant_name: oi.variant_name ?? null,
                menu_item: oi.menu_item,
              })),
            }
          : undefined,
      };
    });

    result.sort((a, b) => a.original_table_number.localeCompare(b.original_table_number, undefined, { numeric: true, sensitivity: 'base' }));
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/tables error:', error);
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
  }
}

// POST /api/tables - Create a new table
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const restaurantId = (session.user as any).restaurantId;

    const { table_number, capacity, area } = await req.json();
    
    const existing = await prisma.table.findFirst({ where: { restaurant_id: restaurantId, table_number } });
    if (existing) {
      return NextResponse.json({ error: 'Table number already exists' }, { status: 400 });
    }

    const table = await prisma.table.create({
      data: {
        restaurant_id: restaurantId,
        table_number,
        capacity: Number(capacity) || 4,
        area: area || 'INDOOR',
        status: 'AVAILABLE'
      }
    });
    return NextResponse.json(table);
  } catch (error) {
    console.error('POST /api/tables error:', error);
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 });
  }
}
