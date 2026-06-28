import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const restaurant = await prisma.restaurant.findFirst();
    if (!restaurant) return NextResponse.json({ error: 'Restaurant not configured' }, { status: 404 });

    if (!restaurant.swiggy_enabled) {
      return NextResponse.json({ error: 'Swiggy integration is currently disabled' }, { status: 403 });
    }

    // Swiggy sends authorization in headers (typically a Bearer token or custom header)
    const authHeader = req.headers.get('authorization') || req.headers.get('x-swiggy-signature');
    
    // In a real integration, we would verify the HMAC signature of the payload against the secret key.
    // For now, we simulate API key validation.
    if (authHeader !== `Bearer ${restaurant.swiggy_api_key}`) {
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      console.warn('Swiggy signature verification skipped for mock mode.');
    }

    const payload = await req.json();
    console.log('[SWIGGY WEBHOOK RECEIVED]', payload);

    // Mock processing logic:
    // 1. Map Swiggy items to internal inventory items
    // 2. Create Order in DB with order_type = 'SWIGGY' and external_id = payload.order_id
    // 3. Ring bell notification for dashboard

    return NextResponse.json({ success: true, message: 'Order acknowledged' });
  } catch (error) {
    console.error('[SWIGGY WEBHOOK ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
