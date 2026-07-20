import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserId } from '@/lib/auth';

export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Please login' }, { status: 401 });

  const { code, password } = await request.json();

  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  if (!user.twoFactorEnabled) {
    return NextResponse.json({ success: false, error: '2FA is not enabled' }, { status: 400 });
  }

  // Accept either a valid current TOTP code OR the account password - the
  // password fallback exists so losing the authenticator app doesn't
  // permanently lock someone out of turning 2FA off.
  let verified = false;
  if (code && user.twoFactorSecret) {
    verified = authenticator.verify({ token: String(code), secret: user.twoFactorSecret });
  }
  if (!verified && password) {
    verified = await user.comparePassword(password);
  }

  if (!verified) {
    return NextResponse.json({ success: false, error: 'Incorrect code or password' }, { status: 400 });
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  await user.save();

  return NextResponse.json({ success: true, message: '2FA disabled' });
}
