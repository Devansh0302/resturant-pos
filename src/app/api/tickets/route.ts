import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const restaurantId = (session?.user as any)?.restaurantId;
    if (!session || !restaurantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tickets = await prisma.supportTicket.findMany({
      where: { restaurant_id: restaurantId },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const restaurantId = (session?.user as any)?.restaurantId;
    if (!session || !restaurantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { subject, description, priority } = await req.json();

    if (!subject || !description) {
      return NextResponse.json({ error: 'Subject and description are required' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        restaurant_id: restaurantId,
        subject,
        description,
        priority: priority || 'NORMAL',
        created_by: (session.user as any).id
      }
    });

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Failed to create ticket:', error);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
