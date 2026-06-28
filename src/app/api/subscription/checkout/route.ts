import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Razorpay from 'razorpay';

const prisma = new PrismaClient();

const PLANS = {
  annual: { name: 'Annual Premium', type: 'ANNUAL', amount: 4499 },
  quarterly: { name: 'Quarterly Professional', type: 'QUARTERLY', amount: 1299 },
  monthly: { name: 'Monthly Starter', type: 'MONTHLY', amount: 499 },
};

export async function POST(req: Request) {
  try {
    const { plan } = await req.json();

    if (!PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const selectedPlan = PLANS[plan as keyof typeof PLANS];
    const taxAmount = parseFloat((selectedPlan.amount * 0.18).toFixed(2));
    const totalAmount = selectedPlan.amount + taxAmount;

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
    });

    // Create a real Razorpay Order
    const options = {
      amount: Math.round(totalAmount * 100), // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };
    
    const razorpayOrder = await razorpay.orders.create(options);

    const session = await prisma.checkoutSession.create({
      data: {
        plan_name: selectedPlan.name,
        plan_type: selectedPlan.type,
        amount: selectedPlan.amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: 'PENDING',
        razorpay_order_id: razorpayOrder.id,
      },
    });

    return NextResponse.json({
      success: true,
      url: `/checkout/${session.id}`, // We still go to our checkout page to display the invoice and launch razorpay
      sessionId: session.id,
      razorpayOrderId: razorpayOrder.id,
      amount: options.amount,
      currency: options.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
