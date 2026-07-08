import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await dbConnect();
  const { userId, amount, reason } = await request.json();
  const validAmount = parseFloat(String(amount));
  if (isNaN(validAmount) || validAmount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  user.walletBalance = (parseFloat(String(user.walletBalance)) || 0) + validAmount;
  await user.save();

  await Transaction.create({ userId, type: 'admin_credit', description: `Admin credit: ${reason || 'Manual'}`, amount: validAmount, status: 'success' });
  return NextResponse.json({ success: true, newBalance: user.walletBalance });
}
