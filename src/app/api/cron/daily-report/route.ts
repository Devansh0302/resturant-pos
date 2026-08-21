import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { startOfYesterday, endOfYesterday, format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Authentication (Vercel Cron automatically adds this header)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow if triggered by Vercel Cron OR if correct Bearer token is provided
    if (authHeader !== `Bearer ${cronSecret}` && process.env.NODE_ENV === 'production') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch all restaurants with daily reporting enabled
    const restaurants = await prisma.restaurant.findMany({
      where: {
        daily_email_report_enabled: true,
        daily_email_report_address: { not: null },
      },
    });

    if (restaurants.length === 0) {
      return NextResponse.json({ message: 'No restaurants configured for daily reports.' });
    }

    const yesterdayStart = startOfYesterday();
    const yesterdayEnd = endOfYesterday();
    const reportDateStr = format(yesterdayStart, 'PPP'); // e.g., "April 29, 2023"

    const results = [];

    // 3. Process each restaurant
    for (const restaurant of restaurants) {
      if (!restaurant.daily_email_report_address) continue;

      // Fetch yesterday's completed orders
      const orders = await prisma.order.findMany({
        where: {
          restaurant_id: restaurant.id,
          created_at: {
            gte: yesterdayStart,
            lte: yesterdayEnd,
          },
          status: {
            in: ['PAID', 'SERVED', 'COMPLETED']
          }
        },
      });

      // Calculate aggregates
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
      const totalGst = orders.reduce((sum, order) => sum + order.cgst_amount + order.sgst_amount, 0);
      const totalDiscount = orders.reduce((sum, order) => sum + order.discount_amount, 0);
      
      let upiCollected = 0;
      let cardCollected = 0;
      let cashCollected = 0;
      orders.forEach(o => {
        if (o.payment_mode === 'SPLIT' && o.split_payments) {
          const splits = o.split_payments as { CASH?: number, UPI?: number, CARD?: number };
          cashCollected += splits.CASH || 0;
          upiCollected += splits.UPI || 0;
          cardCollected += splits.CARD || 0;
        } else {
          if (o.payment_mode === 'CASH') cashCollected += o.total_amount;
          if (o.payment_mode === 'UPI') upiCollected += o.total_amount;
          if (o.payment_mode === 'CARD') cardCollected += o.total_amount;
        }
      });

      // 4. Send Email using Resend
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background-color: #4F46E5; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">${restaurant.name}</h1>
            <p style="color: #EEF2FF; margin: 5px 0 0 0;">Daily Sales Report - ${reportDateStr}</p>
          </div>
          
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Total Revenue</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-size: 18px; font-weight: bold; color: #4F46E5;">₹${totalRevenue.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">Total Orders</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${totalOrders}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">Total GST Collected</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${totalGst.toFixed(2)}</td>
              </tr>
               <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">Total Discounts Given</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${totalDiscount.toFixed(2)}</td>
              </tr>
            </table>

            <h3 style="color: #444; border-bottom: 2px solid #4F46E5; padding-bottom: 5px; display: inline-block;">Payment Breakdown</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <tr>
                <td style="padding: 8px 0;">📱 UPI</td>
                <td style="padding: 8px 0; text-align: right;">₹${upiCollected.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">💳 Card</td>
                <td style="padding: 8px 0; text-align: right;">₹${cardCollected.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">💵 Cash</td>
                <td style="padding: 8px 0; text-align: right;">₹${cashCollected.toFixed(2)}</td>
              </tr>
            </table>

            <div style="margin-top: 30px; font-size: 12px; color: #888; text-align: center;">
              This is an automated email generated by your POS system. To stop receiving these emails, disable the feature in your Dashboard Settings.
            </div>
          </div>
        </div>
      `;

      // 5. Generate PDF Attachment
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`${restaurant.name} - Daily Statement`, 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Date: ${reportDateStr}`, 14, 30);
      
      const tableData = [
        ['Total Revenue', `Rs. ${totalRevenue.toFixed(2)}`],
        ['Total Orders', totalOrders.toString()],
        ['Total GST', `Rs. ${totalGst.toFixed(2)}`],
        ['Total Discounts', `Rs. ${totalDiscount.toFixed(2)}`],
        ['UPI Collected', `Rs. ${upiCollected.toFixed(2)}`],
        ['Card Collected', `Rs. ${cardCollected.toFixed(2)}`],
        ['Cash Collected', `Rs. ${cashCollected.toFixed(2)}`]
      ];

      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Value']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [2, 76, 72] } // #4F46E5 theme color
      });

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      try {
        const data = await resend.emails.send({
          from: 'NXTDINE POS <onboarding@resend.dev>', // Use resend test domain by default
          to: restaurant.daily_email_report_address,
          subject: `${restaurant.name} - Daily Sales Report (${reportDateStr})`,
          html: emailHtml,
          attachments: [
            {
              filename: `Statement_${format(yesterdayStart, 'yyyy-MM-dd')}.pdf`,
              content: pdfBuffer,
            }
          ]
        });
        results.push({ restaurant: restaurant.name, status: 'success', data });
      } catch (error) {
        results.push({ restaurant: restaurant.name, status: 'failed', error });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });

  } catch (error: any) {
    console.error('CRON_DAILY_REPORT_ERROR', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
