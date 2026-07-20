import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserId } from '@/lib/auth';

// Generates a new TOTP secret and returns it as a scannable QR code. The
// secret is stored right away but twoFactorEnabled stays false until the
// user proves they can generate a valid code via /verify-setup - this
// prevents someone locking themselves out with a secret they never
// actually saved to their authenticator app.
export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Please login' }, { status: 401 });

  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  if (user.twoFactorEnabled) {
    return NextResponse.json({ success: false, error: '2FA is already enabled' }, { status: 400 });
  }

  const secret = authenticator.generateSecret();
  user.twoFactorSecret = secret;
  await user.save();

  const otpauthUrl = authenticator.keyuri(user.email, "Sammy's Store", secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return NextResponse.json({ success: true, secret, qrCodeDataUrl });
}
