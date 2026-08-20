import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function checkSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') return false;
  return true;
}

export async function GET() {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { duration: 'asc' },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('GET /api/super-admin/plans error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, duration, price } = body;

    if (!name || !slug || !duration || price === undefined) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        slug,
        duration: Number(duration),
        price: Number(price),
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('POST /api/super-admin/plans error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const data: any = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.price !== undefined) data.price = Number(updates.price);
    if (updates.is_active !== undefined) data.is_active = updates.is_active;

    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data,
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('PATCH /api/super-admin/plans error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
