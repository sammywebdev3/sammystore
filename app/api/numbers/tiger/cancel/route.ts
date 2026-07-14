import { NextResponse } from 'next/server';
import { cancelActivation } from '@/lib/tigerSms';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import { getUserId } from '@/lib/auth';

export async function POST(request: Request) {
  await dbConnect();

  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { activationId } = await request.json();
  if (!activationId) {
    return NextResponse.json({ error: 'activationId required' }, { status: 400 });
  }

  // Only let a user cancel a number that's actually theirs, and only if it
  // hasn't already been refunded/cancelled.
  const txn = await Transaction.findOne({
    userId,
    activationId: String(activationId),
    type: 'virtual_number',
  });

  if (!txn) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (txn.status === 'refunded' || txn.metadata?.cancelled) {
    return NextResponse.json({ error: 'This number was already cancelled' }, { status: 400 });
  }

  try {
    await cancelActivation(String(activationId));
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to cancel with provider' }, { status: 400 });
  }

  await User.findByIdAndUpdate(userId, { $inc: { walletBalance: txn.amount } });
  txn.status = 'refunded';
  txn.metadata = { ...(txn.metadata || {}), cancelled: true };
  await txn.save();

  return NextResponse.json({ success: true, refunded: txn.amount });
}
