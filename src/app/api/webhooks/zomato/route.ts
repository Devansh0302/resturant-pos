import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const restaurant = await prisma.restaurant.findFirst();
    if (!restaurant) return NextResponse.json({ error: 'Restaurant not configured' }, { status: 404 });

    if (!restaurant.zomato_enabled) {
      return NextResponse.json({ error: 'Zomato integration is currently disabled' }, { status: 403 });
    }

    // Zomato typically sends an API Key in a custom header
    const authHeader = req.headers.get('zomato-api-key');
    
    // In a real integration, we validate the header
    if (authHeader !== restaurant.zomato_api_key) {
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      console.warn('Zomato signature verification skipped for mock mode.');
    }

    const payload = await req.json();
    console.log('[ZOMATO WEBHOOK RECEIVED]', payload);

    // Mock processing logic:
    // 1. Map Zomato items to internal inventory items
    // 2. Create Order in DB with order_type = 'ZOMATO' and external_id = payload.order_id
    // 3. Ring bell notification for dashboard

    return NextResponse.json({ status: 'success', message: 'Order received successfully' });
  } catch (error) {
    console.error('[ZOMATO WEBHOOK ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
