import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const restaurantId = (session.user as any).restaurantId;
    const { id } = await params;

    // First check if the table belongs to the restaurant
    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        orders: {
          where: { status: 'OPEN' }
        },
        merged_tables: true
      }
    });

    if (!table || table.restaurant_id !== restaurantId) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Check if table is occupied (has OPEN orders)
    if (table.orders.length > 0) {
      return NextResponse.json({ error: 'Cannot delete an occupied table' }, { status: 400 });
    }
    
    // Check if table has merged tables attached to it
    if (table.merged_tables.length > 0) {
      return NextResponse.json({ error: 'Cannot delete a table with merged tables. Demerge first.' }, { status: 400 });
    }
    
    // Check if table is currently merged into another table
    if (table.merged_with_id) {
      return NextResponse.json({ error: 'Cannot delete a table that is merged with another. Demerge first.' }, { status: 400 });
    }

    // Unlink any historical (closed/cancelled) orders to avoid foreign key constraint errors
    await prisma.order.updateMany({
      where: { table_id: id },
      data: { table_id: null }
    });

    await prisma.table.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/tables/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const restaurantId = (session.user as any).restaurantId;
    const { id } = await params;
    const { table_number, capacity, area } = await req.json();

    const table = await prisma.table.findUnique({
      where: { id }
    });

    if (!table || table.restaurant_id !== restaurantId) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    if (table_number && table_number !== table.table_number) {
      const existing = await prisma.table.findFirst({
        where: { restaurant_id: restaurantId, table_number }
      });
      if (existing) {
        return NextResponse.json({ error: 'Table number already exists' }, { status: 400 });
      }
    }

    const updatedTable = await prisma.table.update({
      where: { id },
      data: {
        ...(table_number && { table_number }),
        ...(capacity && { capacity: Number(capacity) }),
        ...(area && { area }),
      }
    });

    return NextResponse.json(updatedTable);
  } catch (error) {
    console.error('PATCH /api/tables/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 });
  }
}
