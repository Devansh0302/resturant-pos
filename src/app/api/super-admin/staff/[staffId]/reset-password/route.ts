import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function checkSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'SUPER_ADMIN') return null;
  return session;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const session = await checkSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { staffId } = await params;
    const { newPassword } = await req.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { restaurant: { select: { name: true, id: true } } },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.staff.update({
      where: { id: staffId },
      data: { password: hashedPassword },
    });

    await prisma.platformLog.create({
      data: {
        action: 'TENANT_UPDATED',
        description: `Reset password for staff member ${staff.name} (${staff.email})`,
        restaurant_id: staff.restaurant_id,
        performed_by: (session.user as any).id,
      },
    });

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('POST /api/super-admin/staff/[staffId]/reset-password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
