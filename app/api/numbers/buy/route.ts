import { NextResponse } from 'next/server';
import { fiveSimRequest } from '@/lib/5sim';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserId } from '@/lib/auth';

export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Please login' }, { status: 401 });

  const { countryCode, productId } = await request.json();
  
  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  try {
    // Activate number on 5sim
    const activation = await fiveSimRequest(`/buy/activation/${countryCode}/${productId}`, 'POST');
    
    // Deduct from wallet (you'll need to get the price first)
    const price = activation.cost || 0;
    if (user.walletBalance < price) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    user.walletBalance -= price;
    await user.save();

    return NextResponse.json({ 
      success: true, 
      orderId: activation.id,
      phoneNumber: activation.phone,
      newBalance: user.walletBalance
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
