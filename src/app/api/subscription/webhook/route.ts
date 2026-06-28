import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateInvoiceNumber() {
  return `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function POST(req: Request) {
  try {
    const { sessionId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = await req.json();

    if (!sessionId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify Signature
    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
    const generated_signature = crypto.createHmac('sha256', secret)
      .update(razorpayOrderId + "|" + razorpayPaymentId)
      .digest('hex');

    if (generated_signature !== razorpaySignature) {
      return NextResponse.json({ error: 'Invalid Payment Signature' }, { status: 400 });
    }

    const session = await prisma.checkoutSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 });
    }

    // Process the payment (simulate webhook business logic)
    await prisma.$transaction(async (tx) => {
      // 1. Mark session as PAID
      await tx.checkoutSession.update({
        where: { id: sessionId },
        data: { status: 'PAID' },
      });

      // 2. Fetch the restaurant
      const restaurant = await tx.restaurant.findFirst();
      if (!restaurant) throw new Error('Restaurant not found');

      // 3. Calculate new dates
      let newEndDate = new Date();
      if (restaurant.subscription_end_date && restaurant.subscription_end_date > new Date()) {
        newEndDate = new Date(restaurant.subscription_end_date);
      }
      
      const startsAt = new Date(newEndDate);

      if (session.plan_type === 'ANNUAL') {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      } else if (session.plan_type === 'QUARTERLY') {
        newEndDate.setMonth(newEndDate.getMonth() + 3);
      } else if (session.plan_type === 'MONTHLY') {
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      }

      // 4. Update Restaurant Subscription Status
      await tx.restaurant.update({
        where: { id: restaurant.id },
        data: {
          subscription_status: 'ACTIVE',
          subscription_end_date: newEndDate,
        },
      });

      // 5. Create Receipt in Subscription History
      const invoiceNumber = generateInvoiceNumber();
      const transactionId = `txn_${crypto.randomBytes(8).toString('hex')}`;
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const cycleString = `${monthNames[startsAt.getMonth()]} ${startsAt.getFullYear()} – ${monthNames[newEndDate.getMonth()]} ${newEndDate.getFullYear()}`;

      await tx.subscriptionHistory.create({
        data: {
          invoice_number: invoiceNumber,
          plan_name: session.plan_name,
          plan_type: session.plan_type,
          billing_cycle: cycleString,
          amount: session.amount,
          tax_amount: session.tax_amount,
          total_amount: session.total_amount,
          payment_method: "RAZORPAY",
          payment_status: 'PAID',
          transaction_id: transactionId,
          razorpay_payment_id: razorpayPaymentId,
          event_type: 'RENEWAL',
          starts_at: startsAt,
          ends_at: newEndDate,
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Payment processed successfully' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
