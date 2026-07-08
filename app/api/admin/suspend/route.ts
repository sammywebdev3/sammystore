import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await dbConnect();
  const { userId, suspended, reason } = await request.json();
  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  user.suspended = suspended;
  user.suspendReason = reason || '';
  await user.save();

  return NextResponse.json({ success: true, message: suspended ? 'User suspended' : 'User unsuspended' });
}
