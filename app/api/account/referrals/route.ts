import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { getUserId } from '@/lib/auth';

export async function GET(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Please login' }, { status: 401 });

  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  const referredCount = await User.countDocuments({ referredBy: userId });
  const totalEarned = await Transaction.aggregate([
    { $match: { userId: user._id, type: 'referral_bonus', status: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  return NextResponse.json({
    success: true,
    referralCode: user.referralCode,
    referredCount,
    totalEarned: totalEarned[0]?.total || 0,
  });
}
