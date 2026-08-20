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

    // Upsert to ensure a record exists
    let settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      settings = await prisma.platformSettings.create({ data: { id: 'global' } });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET /api/super-admin/settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await checkSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { platform_name, default_subscription_days, default_cgst_rate, default_sgst_rate, support_email } = body;

    const data: any = {};
    if (platform_name !== undefined) data.platform_name = platform_name;
    if (default_subscription_days !== undefined) data.default_subscription_days = parseInt(default_subscription_days);
    if (default_cgst_rate !== undefined) data.default_cgst_rate = parseFloat(default_cgst_rate);
    if (default_sgst_rate !== undefined) data.default_sgst_rate = parseFloat(default_sgst_rate);
    if (support_email !== undefined) data.support_email = support_email;

    const settings = await prisma.platformSettings.upsert({
      where: { id: 'global' },
      update: data,
      create: { id: 'global', ...data },
    });

    // Log the change
    await prisma.platformLog.create({
      data: {
        action: 'SETTINGS_UPDATED',
        description: `Platform settings updated: ${Object.keys(data).join(', ')}`,
        performed_by: (session.user as any).id,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('PATCH /api/super-admin/settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
