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
      name, address, phone, ownerEmail, ownerName,
      max_staff_profiles, subscriptionPlan, addonIds
    } = body;

    if (!name || !ownerEmail || !ownerName) {
      return NextResponse.json({ error: 'Restaurant name, owner name, and owner email are required' }, { status: 400 });
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

    // Generate a secure setup token (48-hour expiry)
    const setupToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Placeholder password that can never be matched by bcrypt.compare
    const placeholderPassword = '!PENDING_SETUP!';

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

      // Create Admin Staff with placeholder password and setup token
      await tx.staff.create({
        data: {
          name: ownerName || 'Admin',
          email: ownerEmail,
          password: placeholderPassword,
          pin: '0000',
          role: 'ADMIN',
          restaurant_id: newRestaurant.id,
          password_reset_token: setupToken,
          password_reset_expires: tokenExpiry,
        },
      });

      return newRestaurant;
    });

    // Build the setup URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const setupUrl = `${baseUrl}/setup-password?token=${setupToken}`;

    // Send invite email via Resend
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: 'NXTDINE POS <onboarding@resend.dev>',
        to: ownerEmail,
        subject: `Welcome to NXTDINE — Set Up Your Account`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0;">Welcome to NXTDINE 🎉</h1>
              <p style="font-size: 14px; color: #6b7280; margin-top: 8px;">Your restaurant <strong>${name}</strong> has been set up.</p>
            </div>
            <p style="font-size: 14px; color: #374151; line-height: 1.6;">
              Hi <strong>${ownerName}</strong>,<br/><br/>
              Your restaurant account has been provisioned on the NXTDINE platform. To get started, please set your password and 4-digit PIN by clicking the button below.
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${setupUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px;">
                Set Up My Account
              </a>
            </div>
            <p style="font-size: 12px; color: #9ca3af; line-height: 1.5;">
              This link will expire in <strong>48 hours</strong>. If you didn't expect this email, you can safely ignore it.
            </p>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
            <p style="font-size: 11px; color: #d1d5db; text-align: center;">
              NXTDINE Restaurant Management Platform
            </p>
          </div>
        `,
      });
      console.log(`✅ Setup email sent to ${ownerEmail}`);
    } catch (emailError) {
      // Email send failed — log but don't fail the provisioning
      console.error('⚠️ Failed to send setup email:', emailError);
    }

    // Always log the setup URL to console for local development
    console.log(`\n🔗 Password setup link for ${ownerEmail}:\n   ${setupUrl}\n`);

    // Log the provisioning
    const session = await getServerSession(authOptions);
    await prisma.platformLog.create({
      data: {
        action: 'TENANT_PROVISIONED',
        description: `New tenant "${name}" provisioned with owner ${ownerEmail}. Setup invite sent.`,
        restaurant_id: restaurant.id,
        performed_by: (session?.user as any)?.id || 'system',
      },
    });

    return NextResponse.json({ ...restaurant, setupEmailSent: true, setupUrl }, { status: 201 });
  } catch (error) {
    console.error('POST /api/super-admin/restaurants error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

