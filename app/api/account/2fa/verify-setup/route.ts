import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserId } from '@/lib/auth';

export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Please login' }, { status: 401 });

  const { code } = await request.json();
  if (!code) return NextResponse.json({ success: false, error: 'Code required' }, { status: 400 });

  const user = await User.findById(userId);
  if (!user || !user.twoFactorSecret) {
    return NextResponse.json({ success: false, error: 'No pending 2FA setup found' }, { status: 400 });
  }

  const isValid = authenticator.verify({ token: String(code), secret: user.twoFactorSecret });
  if (!isValid) {
    return NextResponse.json({ success: false, error: 'Invalid code - check your authenticator app and try again' }, { status: 400 });
  }

  user.twoFactorEnabled = true;
  await user.save();

  return NextResponse.json({ success: true, message: '2FA enabled successfully' });
}
