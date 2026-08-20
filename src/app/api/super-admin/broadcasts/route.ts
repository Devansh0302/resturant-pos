import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isSuperAdmin = (session.user as any).role === 'SUPER_ADMIN';

    // If super admin, fetch all broadcasts. If tenant, fetch only active broadcasts that haven't expired.
    if (isSuperAdmin) {
      const broadcasts = await prisma.broadcastMessage.findMany({
        orderBy: { created_at: 'desc' }
      });
      return NextResponse.json(broadcasts);
    } else {
      const activeBroadcasts = await prisma.broadcastMessage.findMany({
        where: {
          is_active: true,
          OR: [
            { expires_at: null },
            { expires_at: { gt: new Date() } }
          ]
        },
        orderBy: { created_at: 'desc' }
      });
      return NextResponse.json(activeBroadcasts);
    }
  } catch (error) {
    console.error('Failed to fetch broadcasts:', error);
    return NextResponse.json({ error: 'Failed to fetch broadcasts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, message, type, expires_at } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const broadcast = await prisma.broadcastMessage.create({
      data: {
        title,
        message,
        type: type || 'INFO',
        created_by: (session.user as any).id,
        expires_at: expires_at ? new Date(expires_at) : null
      }
    });

    return NextResponse.json(broadcast);
  } catch (error) {
    console.error('Failed to create broadcast:', error);
    return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 });
  }
}
