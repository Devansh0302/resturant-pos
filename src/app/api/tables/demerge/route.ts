import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { primary_table_id } = data;

    if (!primary_table_id) {
      return NextResponse.json({ error: 'Primary table ID required' }, { status: 400 });
    }

    // Unmerge all tables attached to this primary table
    await prisma.table.updateMany({
      where: { merged_with_id: primary_table_id },
      data: {
        status: 'AVAILABLE',
        merged_with_id: null
      }
    });

    return NextResponse.json({ success: true, message: 'Tables demerged successfully' });
  } catch (error) {
    console.error('Failed to demerge tables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
