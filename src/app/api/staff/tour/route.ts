import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.staff.update({
      where: { id: (session.user as any).id },
      data: { has_seen_tour: true }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/staff/tour error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
