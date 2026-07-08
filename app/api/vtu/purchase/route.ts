import { NextResponse } from 'next/server';
import { clubkonnectRequest } from '@/lib/clubkonnect';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserId } from '@/lib/auth';

export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Please login' }, { status: 401 });

  const { service_type, network, phone, amount, plan_id } = await request.json();
  
  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  try {
    // Get plan price
    const plans = await clubkonnectRequest('/plans', { type: service_type, network });
    const plan = plans.find((p: any) => p.id === plan_id);
    
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (user.walletBalance < plan.price) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    // Purchase
    const purchase = await clubkonnectRequest('/purchase', {
      service_type,
      network,
      phone,
      plan_id,
      request_id: Date.now().toString()
    });

    // Deduct from wallet
    user.walletBalance -= plan.price;
    await user.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Purchase successful',
      newBalance: user.walletBalance
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
