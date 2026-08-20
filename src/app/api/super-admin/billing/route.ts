import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function checkSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') return null;
  return session;
}

export async function GET() {
  try {
    const session = await checkSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const payments = await prisma.saaSPayment.findMany({
      orderBy: { payment_date: 'desc' },
      include: { restaurant: { select: { name: true } } },
    });

    // Calculate summaries
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = payments
      .filter(p => new Date(p.payment_date) >= startOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({ payments, totalCollected, thisMonth });
  } catch (error) {
    console.error('GET /api/super-admin/billing error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await checkSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { restaurant_id, amount, payment_method, reference_no, notes } = body;

    if (!restaurant_id || !amount || !payment_method) {
      return NextResponse.json({ error: 'Missing required fields: restaurant_id, amount, payment_method' }, { status: 400 });
    }

    const payment = await prisma.saaSPayment.create({
      data: {
        restaurant_id,
        amount: parseFloat(amount),
        payment_method,
        reference_no: reference_no || null,
        notes: notes || null,
        created_by: (session.user as any).id,
      },
    });

    // Log the action
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurant_id }, select: { name: true } });
    await prisma.platformLog.create({
      data: {
        action: 'PAYMENT_RECORDED',
        description: `Payment of ₹${amount} recorded for ${restaurant?.name || restaurant_id} via ${payment_method}`,
        restaurant_id,
        performed_by: (session.user as any).id,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('POST /api/super-admin/billing error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
