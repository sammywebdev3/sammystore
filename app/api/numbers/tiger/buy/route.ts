import { NextResponse } from 'next/server';
import { buyNumber, getServices } from '@/lib/tigerSms';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { getUserId } from '@/lib/auth';

export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { country, service } = await request.json();
  if (!country || !service) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  try {
    // Get live price for accurate deduction
    const services = await getServices(country);
    const selected = services.find(s => s.service === service);
    if (!selected) return NextResponse.json({ error: 'Service unavailable' }, { status: 400 });
    
    const priceNgn = selected.price * 1550;
    if (user.walletBalance < priceNgn) 
      return NextResponse.json({ error: `Insufficient funds. Need ₦${priceNgn.toFixed(2)}` }, { status: 400 });

    const order = await buyNumber(country, service);

    user.walletBalance -= priceNgn;
    await user.save();

    await Transaction.create({
      userId, type: 'virtual_number', description: `TigerSMS: ${order.number}`, amount: priceNgn, status: 'success'
    });

    return NextResponse.json({ 
      success: true, orderId: order.id, phoneNumber: order.number, priceNgn, newBalance: user.walletBalance 
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
