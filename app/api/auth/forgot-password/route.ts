import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { sendPasswordResetEmail } from '@/lib/email';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Always returns the same generic success message whether or not the
// email exists on an account - this prevents "user enumeration" (an
// attacker probing which emails are registered by watching for a
// different response), same reasoning as most login/signup flows.
export async function POST(request: Request) {
  try {
    await dbConnect();

    const ip = getClientIp(request);
    const limit = await checkRateLimit(`forgot-password:ip:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ success: false, error: 'Please enter your email' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    // Separate, tighter limit per-email so repeated requests for the same
    // account can't be used to spam that person's inbox even from
    // different IPs.
    const emailLimit = await checkRateLimit(`forgot-password:email:${normalizedEmail}`, 3, 60 * 60 * 1000);

    const genericResponse = NextResponse.json({
      success: true,
      message: 'If an account exists for that email, a reset link has been sent.',
    });

    if (!emailLimit.allowed) {
      // Still return the generic success message - don't reveal that
      // rate limiting is the reason, that would itself leak whether the
      // email exists (real accounts get limited, fake ones never would
      // generate enough attempts to matter... except an attacker probing
      // could tell the difference). Simplest safe answer: same message
      // either way, just silently skip sending.
      return genericResponse;
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return genericResponse;
    }

    // Raw token goes in the emailed link only. Only its hash is stored,
    // so a database leak alone can never be used to reset someone's
    // password - same principle as never storing plaintext passwords.
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const resetUrl = `${siteUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

    sendPasswordResetEmail({ to: user.email, resetUrl }).catch((err) =>
      console.error('Password reset email failed:', err)
    );

    return genericResponse;
  } catch (error: any) {
    console.error('Forgot password error:', error.message);
    return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
