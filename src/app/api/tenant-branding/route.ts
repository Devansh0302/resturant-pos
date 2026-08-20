import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { custom_domain: domain },
      select: {
        id: true,
        name: true,
        logo_url: true,
        theme_color: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error('Error fetching tenant branding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
