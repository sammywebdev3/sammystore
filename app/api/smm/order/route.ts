import { NextResponse } from 'next/server';
import { japRequest } from '@/lib/jap';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserId } from '@/lib/auth';

export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Please login' }, { status: 401 });

  const { service, link, quantity } = await request.json();
  
  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  try {
    // Get service price first
    const services = await japRequest('services');
    const selectedService = services.find((s: any) => s.service === parseInt(service));
    
    if (!selectedService) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    // Calculate cost
    const cost = (selectedService.rate * quantity) / 1000;
    
    if (user.walletBalance < cost) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    // Place order
    const order = await japRequest('add', {
      service,
      link,
      quantity: quantity.toString()
    });

    // Deduct from wallet
    user.walletBalance -= cost;
    await user.save();

    return NextResponse.json({ 
      success: true, 
      orderId: order.order,
      newBalance: user.walletBalance
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
