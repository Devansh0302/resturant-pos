import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET /api/staff - Get all staff
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where = { restaurant_id: (session.user as any).restaurantId || null };

    const staff = await prisma.staff.findMany({
      where,
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        pin: true, 
        is_active: true,
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(staff);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

// POST /api/staff - Create new staff (ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, pin } = body;
    const targetRole = role || 'WAITER';

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: (session.user as any).restaurantId }
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const currentStaffCount = await prisma.staff.count({
      where: { restaurant_id: (session.user as any).restaurantId }
    });

    if (currentStaffCount >= (restaurant.max_staff_profiles || 5)) {
      return NextResponse.json({ error: `You have reached the limit of ${restaurant.max_staff_profiles} staff profiles for your plan. Please contact Super Admin to upgrade.` }, { status: 403 });
    }

    if (targetRole === 'ADMIN') {
      const count = await prisma.staff.count({
        where: { role: 'ADMIN', is_active: true }
      });
      if (count >= 1) {
        return NextResponse.json({ error: `Maximum limit of 1 active ADMIN reached.` }, { status: 400 });
      }
    } else if (targetRole === 'CASHIER') {
      const count = await prisma.staff.count({
        where: { role: 'CASHIER', is_active: true }
      });
      if (count >= 2) {
        return NextResponse.json({ error: `Maximum limit of 2 active CASHIERs reached.` }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password || 'password123', 12);

    const staff = await prisma.staff.create({
      data: { name, email, password: hashedPassword, role: role || 'WAITER', pin: pin || '0000', restaurant_id: (session.user as any).restaurantId },
      select: { id: true, name: true, email: true, role: true, is_active: true },
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create staff' }, { status: 500 });
  }
}

// PATCH /api/staff - Update staff (ADMIN only)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...data } = body;

    const staffBeingUpdated = await prisma.staff.findUnique({ where: { id } });
    if (!staffBeingUpdated) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    
    // Security check: ensure the staff belongs to the admin's restaurant
    if (staffBeingUpdated.restaurant_id !== (session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (staffBeingUpdated.role === 'ADMIN' && data.role && data.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Cannot downgrade the only ADMIN account' }, { status: 400 });
    }

    const newRole = data.role !== undefined ? data.role : staffBeingUpdated.role;
    const newIsActive = data.is_active !== undefined ? data.is_active : staffBeingUpdated.is_active;

    if (newIsActive) {
      if (newRole === 'ADMIN') {
        const count = await prisma.staff.count({
          where: { role: 'ADMIN', is_active: true, id: { not: id } }
        });
        if (count >= 1) {
          return NextResponse.json({ error: `Maximum limit of 1 active ADMIN reached.` }, { status: 400 });
        }
      } else if (newRole === 'CASHIER') {
        const count = await prisma.staff.count({
          where: { role: 'CASHIER', is_active: true, id: { not: id } }
        });
        if (count >= 2) {
          return NextResponse.json({ error: `Maximum limit of 2 active CASHIERs reached.` }, { status: 400 });
        }
      }
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 12);
    }

    const staff = await prisma.staff.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, is_active: true },
    });

    return NextResponse.json(staff);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 });
  }
}

// DELETE /api/staff - Delete staff (ADMIN only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing staff id' }, { status: 400 });
    }

    if (id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const staffBeingDeleted = await prisma.staff.findUnique({ where: { id } });
    if (!staffBeingDeleted) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });

    if (staffBeingDeleted.restaurant_id !== (session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.staff.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete staff with existing orders. Please deactivate them instead.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to delete staff' }, { status: 500 });
  }
}
