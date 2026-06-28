import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { primary_table_id, secondary_table_ids } = data;

    if (!primary_table_id || !secondary_table_ids || !Array.isArray(secondary_table_ids)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (secondary_table_ids.length === 0) {
      return NextResponse.json({ error: 'No secondary tables selected' }, { status: 400 });
    }

    // Check if any of these tables have active orders
    const allTableIds = [primary_table_id, ...secondary_table_ids];
    const tables = await prisma.table.findMany({
      where: { id: { in: allTableIds } },
      include: { orders: { where: { status: 'OPEN' } } }
    });

    const busyTable = tables.find(t => t.orders.length > 0 || t.status === 'OCCUPIED');
    if (busyTable) {
      return NextResponse.json(
        { error: `Table ${busyTable.table_number} is already occupied. You can only merge available tables.` },
        { status: 400 }
      );
    }

    // Perform the merge
    // Update all secondary tables to have status = MERGED and merged_with_id = primary_table_id
    await prisma.table.updateMany({
      where: { id: { in: secondary_table_ids } },
      data: {
        status: 'MERGED',
        merged_with_id: primary_table_id
      }
    });

    return NextResponse.json({ success: true, message: 'Tables merged successfully' });
  } catch (error) {
    console.error('Failed to merge tables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
