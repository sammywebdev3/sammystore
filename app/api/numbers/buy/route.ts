import { NextResponse } from 'next/server';
import { buyNumber } from '@/lib/fiveSimAdapter';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { getUserId } from '@/lib/auth';

export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { country, product } = await request.json();
  if (!country || !product) return NextResponse.json({ error: 'Country & product required' }, { status: 400 });

  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const apiRes = await buyNumber(country, product);
  const apiData = await apiRes.json();

  if (!apiData.success) {
    return NextResponse.json({ error: apiData.error }, { status: 400 });
  }

  // Approx USD to NGN conversion (adjust rate as needed)
  const priceInNgn = apiData.price * 1550;
  if (user.walletBalance < priceInNgn) {
    return NextResponse.json({ error: `Insufficient funds. Need ₦${priceInNgn.toFixed(2)}` }, { status: 400 });
  }

  user.walletBalance -= priceInNgn;
  await user.save();

  await Transaction.create({
    userId,
    type: 'virtual_number',
    description: `5sim Number: ${apiData.phoneNumber} (${product})`,
    amount: priceInNgn,
    status: 'success'
  });

  return NextResponse.json({
    success: true,
    orderId: apiData.orderId,
    phoneNumber: apiData.phoneNumber,
    priceNgn: priceInNgn,
    newBalance: user.walletBalance
  });
}
