import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET: Validate a setup token
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const staff = await prisma.staff.findUnique({
      where: { password_reset_token: token },
      select: { 
        name: true, 
        email: true, 
        password_reset_expires: true,
        restaurant: { select: { name: true } },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    if (staff.password_reset_expires && new Date() > staff.password_reset_expires) {
      return NextResponse.json({ error: 'This setup link has expired. Please contact your platform administrator.' }, { status: 410 });
    }

    return NextResponse.json({
      name: staff.name,
      email: staff.email,
      restaurantName: staff.restaurant?.name || 'Your Restaurant',
    });
  } catch (error) {
    console.error('GET /api/auth/setup-password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Set password and PIN using a valid token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password, pin } = body;

    if (!token || !password || !pin) {
      return NextResponse.json({ error: 'Token, password, and PIN are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }

    const staff = await prisma.staff.findUnique({
      where: { password_reset_token: token },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    if (staff.password_reset_expires && new Date() > staff.password_reset_expires) {
      return NextResponse.json({ error: 'This setup link has expired. Please contact your platform administrator.' }, { status: 410 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        password: hashedPassword,
        pin: pin,
        password_reset_token: null,
        password_reset_expires: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Password and PIN set successfully. You can now log in.' });
  } catch (error) {
    console.error('POST /api/auth/setup-password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
