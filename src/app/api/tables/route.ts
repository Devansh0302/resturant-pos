import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/tables - Returns all tables with active order info
export async function GET() {
  try {
    const tables = await prisma.table.findMany({
      where: { merged_with_id: null },
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
        status: table.status,
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
                menu_item: oi.menu_item,
              })),
            }
          : undefined,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/tables error:', error);
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
  }
}
