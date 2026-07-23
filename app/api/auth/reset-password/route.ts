import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    await dbConnect();

    const ip = getClientIp(request);
    // Limits brute-forcing the token itself (it's 32 random bytes so this
    // is already effectively impossible, but rate limiting costs nothing
    // and matches the pattern used everywhere else in this app).
    const limit = await checkRateLimit(`reset-password:ip:${ip}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

    const { email, token, newPassword } = await request.json();
    if (!email || !token || !newPassword) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    if (String(newPassword).length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');

    const user = await User.findOne({
      email: normalizedEmail,
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Plain new password - the schema's pre('save') hook hashes it exactly
    // once (see models/User.ts). Hashing it here too would double-hash it
    // and break future logins, same note as the change-password route.
    user.password = newPassword;
    // One-time use: clear the token immediately so the same link can't be
    // replayed to reset the password again later.
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return NextResponse.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error: any) {
    console.error('Reset password error:', error.message);
    return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
