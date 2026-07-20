import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  await dbConnect();
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Please fill all fields' }, { status: 400 });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const ip = getClientIp(request);

  // Two limits: a looser per-IP limit (catches brute force from one
  // source) and a tighter per-account limit (catches credential stuffing
  // spread across many IPs targeting one email). Checked before touching
  // the DB for the user so a lockout doesn't also leak "this email is
  // valid, only the password check happened after" timing.
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000),
    checkRateLimit(`login:email:${normalizedEmail}`, 5, 15 * 60 * 1000),
  ]);

  if (!ipLimit.allowed || !emailLimit.allowed) {
    const retryAfterSeconds = Math.max(ipLimit.retryAfterSeconds || 0, emailLimit.retryAfterSeconds || 0);
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    );
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Check if user is suspended
    // 2FA check happens after password verification (so we don't leak
    // "this account has 2FA" to someone who doesn't already know the
    // correct password) but before suspension/token issuance.
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return NextResponse.json({ requiresTwoFactor: true }, { status: 200 });
      }
      const validCode = authenticator.verify({ token: String(twoFactorCode), secret: user.twoFactorSecret! });
      if (!validCode) {
        return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });
      }
    }

  if (user.suspended) {
    return NextResponse.json(
      { error: `Account suspended. Reason: ${user.suspendReason || 'No reason provided'}` },
      { status: 403 }
    );
  }

  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  return NextResponse.json({
    success: true,
    token,
    user: { name: user.name, email: user.email, apiKey: user.apiKey, walletBalance: user.walletBalance }
  });
}
