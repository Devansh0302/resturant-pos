import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/menu/price-logs - Get last 20 price changes
export async function GET() {
  try {
    const logs = await prisma.priceLog.findMany({
      orderBy: { changed_at: 'desc' },
      take: 20,
      include: {
        menu_item: { select: { name: true } },
      },
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
