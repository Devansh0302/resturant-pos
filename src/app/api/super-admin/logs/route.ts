import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function checkSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') return null;
  return session;
}

export async function GET(req: NextRequest) {
  try {
    const session = await checkSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const take = parseInt(searchParams.get('take') || '50');

    const where: any = {};
    if (action) where.action = action;

    const logs = await prisma.platformLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take,
      include: { restaurant: { select: { name: true } } },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('GET /api/super-admin/logs error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
