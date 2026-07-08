import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await dbConnect();
  const { userId } = await request.json();
  await User.findByIdAndDelete(userId);
  await Transaction.deleteMany({ userId });

  return NextResponse.json({ success: true, message: 'User deleted' });
}
