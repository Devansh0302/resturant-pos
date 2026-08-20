import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/restaurant - Get restaurant settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: (session.user as any).restaurantId }
    });
    return NextResponse.json(restaurant);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// PATCH /api/restaurant - Update restaurant settings (ADMIN only)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN' || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: (session.user as any).restaurantId }
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        name: body.name,
        address: body.address,
        phone: body.phone,
        gstin: body.gstin,
        cgst_rate: body.cgst_rate ? parseFloat(body.cgst_rate) : undefined,
        sgst_rate: body.sgst_rate ? parseFloat(body.sgst_rate) : undefined,
        swiggy_enabled: body.swiggy_enabled !== undefined ? body.swiggy_enabled : undefined,
        zomato_api_key: body.zomato_api_key !== undefined ? body.zomato_api_key : undefined,
        fssai_no: body.fssai_no !== undefined ? body.fssai_no : undefined,
        bill_footer_msg: body.bill_footer_msg !== undefined ? body.bill_footer_msg : undefined,
        bill_template_config: body.bill_template_config !== undefined ? body.bill_template_config : undefined,
        daily_email_report_enabled: body.daily_email_report_enabled !== undefined ? body.daily_email_report_enabled : undefined,
        daily_email_report_address: body.daily_email_report_address !== undefined ? body.daily_email_report_address : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
