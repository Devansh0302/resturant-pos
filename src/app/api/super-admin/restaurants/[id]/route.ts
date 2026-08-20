import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function checkSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') return null;
  return session;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        staff: { select: { id: true, name: true, email: true, role: true, is_active: true, pin: true } },
        _count: {
          select: {
            orders: true,
            menu_items: true,
            tables: true,
            categories: true,
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Get revenue for this restaurant
    const revenueResult = await prisma.order.aggregate({
      _sum: { total_amount: true },
      where: { restaurant_id: id, payment_status: 'PAID' },
    });

    // Get recent payments
    const payments = await prisma.saaSPayment.findMany({
      where: { restaurant_id: id },
      orderBy: { payment_date: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      ...restaurant,
      revenue: revenueResult._sum.total_amount || 0,
      payments,
    });
  } catch (error) {
    console.error('GET /api/super-admin/restaurants/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();

    const allowedFields = [
      'name', 'address', 'phone', 'gstin', 'fssai_no',
      'cgst_rate', 'sgst_rate', 'subscription_status', 'subscription_end_date',
      'swiggy_enabled', 'zomato_enabled', 'daily_email_report_enabled',
      'theme_color',
      'custom_domain',
      'max_staff_profiles'
    ];

    const data: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'subscription_end_date') {
          data[field] = new Date(body[field]);
        } else if (field === 'cgst_rate' || field === 'sgst_rate') {
          data[field] = parseFloat(body[field]);
        } else {
          data[field] = body[field];
        }
      }
    }

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data,
    });

    // Log the change
    const changedFields = Object.keys(data).join(', ');
    await prisma.platformLog.create({
      data: {
        action: 'TENANT_UPDATED',
        description: `Updated ${restaurant.name}: ${changedFields}`,
        restaurant_id: id,
        performed_by: (session.user as any).id,
      },
    });

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error('PATCH /api/super-admin/restaurants/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    const restaurant = await prisma.restaurant.findUnique({ where: { id }, select: { name: true } });

    // Soft-delete: set status to DELETED
    await prisma.restaurant.update({
      where: { id },
      data: { subscription_status: 'DELETED' },
    });

    await prisma.platformLog.create({
      data: {
        action: 'TENANT_DELETED',
        description: `Tenant "${restaurant?.name}" was deleted`,
        restaurant_id: id,
        performed_by: (session.user as any).id,
      },
    });

    return NextResponse.json({ message: 'Tenant deleted' });
  } catch (error) {
    console.error('DELETE /api/super-admin/restaurants/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
