import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY || "dummy");

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const staff = await prisma.staff.findUnique({
      where: { email },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "No user found with that email address." },
        { status: 404 }
      );
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        password_reset_token: resetToken,
        password_reset_expires: passwordResetExpires,
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: "NxtDine Support <noreply@nxtdine.com>",
        to: email,
        subject: "Reset your NxtDine Password",
        html: `
          <h1>Password Reset Request</h1>
          <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });
    } else {
      console.log('RESEND_API_KEY not set. Reset URL generated:', resetUrl);
    }

    return NextResponse.json({ message: "A password reset link has been sent to your email." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
