import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/subscription – Fetch subscription overview + history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {};
    if (year && year !== 'all') {
      const yearNum = parseInt(year);
      where.created_at = {
        gte: new Date(`${yearNum}-01-01`),
        lt: new Date(`${yearNum + 1}-01-01`),
      };
    }
    if (status && status !== 'all') {
      where.payment_status = status;
    }

    // Fetch history
    const history = await prisma.subscriptionHistory.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    // Fetch current restaurant subscription info
    const restaurant = await prisma.restaurant.findFirst({
      select: {
        subscription_status: true,
        subscription_end_date: true,
      },
    });

    // Compute stats
    const allRecords = await prisma.subscriptionHistory.findMany({
      orderBy: { created_at: 'desc' },
    });

    const totalSpent = allRecords
      .filter(r => r.payment_status === 'PAID')
      .reduce((sum, r) => sum + r.total_amount, 0);

    const totalTax = allRecords
      .filter(r => r.payment_status === 'PAID')
      .reduce((sum, r) => sum + r.tax_amount, 0);

    const totalPayments = allRecords.filter(r => r.payment_status === 'PAID').length;

    // Find the current active plan (latest record with PAID status)
    const currentPlan = allRecords.find(r => r.payment_status === 'PAID');

    // Get unique years for the filter
    const years = [...new Set(allRecords.map(r => new Date(r.created_at).getFullYear()))].sort((a, b) => b - a);

    // Compute lifetime stats
    const firstPayment = allRecords.length > 0 ? allRecords[allRecords.length - 1].created_at : null;
    const daysSinceFirst = firstPayment
      ? Math.floor((Date.now() - new Date(firstPayment).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Payment method breakdown
    const paymentMethodBreakdown: Record<string, { count: number; total: number }> = {};
    for (const r of allRecords.filter(r => r.payment_status === 'PAID')) {
      if (!paymentMethodBreakdown[r.payment_method]) {
        paymentMethodBreakdown[r.payment_method] = { count: 0, total: 0 };
      }
      paymentMethodBreakdown[r.payment_method].count++;
      paymentMethodBreakdown[r.payment_method].total += r.total_amount;
    }

    return NextResponse.json({
      history,
      subscription: {
        status: restaurant?.subscription_status || 'ACTIVE',
        endDate: restaurant?.subscription_end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        currentPlan: currentPlan?.plan_name || 'No Active Plan',
        currentPlanType: currentPlan?.plan_type || 'NONE',
      },
      stats: {
        totalSpent,
        totalTax,
        totalPayments,
        daysSinceFirst,
        averagePerPayment: totalPayments > 0 ? totalSpent / totalPayments : 0,
        paymentMethodBreakdown,
      },
      years,
    });
  } catch (error) {
    console.error('Subscription API error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription data' }, { status: 500 });
  }
}
