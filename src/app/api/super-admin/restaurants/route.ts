import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Helper to check Super Admin access
async function checkSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const restaurants = await prisma.restaurant.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        staff: {
          where: { role: 'ADMIN' },
          select: { name: true, email: true },
          take: 1, // Get the primary owner
        },
      },
    });

    return NextResponse.json(restaurants);
  } catch (error) {
    console.error('GET /api/super-admin/restaurants error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      name, address, phone, ownerEmail, ownerName, ownerPassword,
      max_staff_profiles, subscriptionPlan, addonIds
    } = body;

    if (!name || !ownerEmail || !ownerName || !ownerPassword) {
      return NextResponse.json({ error: 'Restaurant name, owner name, owner email, and owner password are required' }, { status: 400 });
    }

    const existingUser = await prisma.staff.findUnique({
      where: { email: ownerEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Owner email already exists' }, { status: 400 });
    }

    // Calculate subscription end date based on selected plan
    const subscriptionEndDate = new Date();
    const planMonths: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12 };
    const months = planMonths[subscriptionPlan] || 12;
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + months);

    // Hash the password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash(ownerPassword, 12);

    const restaurant = await prisma.$transaction(async (tx) => {
      // Create Restaurant
      const newRestaurant = await tx.restaurant.create({
        data: {
          name,
          address,
          phone,
          subscription_end_date: subscriptionEndDate,
          subscription_status: 'ACTIVE',
          max_staff_profiles: max_staff_profiles !== undefined ? Number(max_staff_profiles) : 5,
          addons: addonIds && addonIds.length > 0 ? {
            connect: addonIds.map((id: string) => ({ id }))
          } : undefined,
        },
      });

      // Create Admin Staff with provided password
      await tx.staff.create({
        data: {
          name: ownerName || 'Admin',
          email: ownerEmail,
          password: hashedPassword,
          pin: '0000',
          role: 'ADMIN',
          restaurant_id: newRestaurant.id,
        },
      });

      return newRestaurant;
    });

    // Log the provisioning
    const session = await getServerSession(authOptions);
    await prisma.platformLog.create({
      data: {
        action: 'TENANT_PROVISIONED',
        description: `New tenant "${name}" provisioned with owner ${ownerEmail}.`,
        restaurant_id: restaurant.id,
        performed_by: (session?.user as any)?.id || 'system',
      },
    });

    return NextResponse.json({ ...restaurant }, { status: 201 });
  } catch (error) {
    console.error('POST /api/super-admin/restaurants error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

