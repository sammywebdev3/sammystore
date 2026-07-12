import { NextResponse } from 'next/server';
import { buyNumber, getPrices } from '@/lib/tigerSms';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { getUserId } from '@/lib/auth';

export async function POST(request: Request) {
  await dbConnect();
  
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { country, service } = await request.json();
  if (!country || !service) {
    return NextResponse.json(
      { error: 'Country and service required' },
      { status: 400 }
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    // Get live price
    const services = await getPrices(country);
    const selectedService = services.find(s => s.service === service);
    
    if (!selectedService) {
      return NextResponse.json(
        { error: 'Service not available in this country' },
        { status: 400 }
      );
    }
    
    // Convert to NGN (Nigerian Naira)
    const priceNgn = parseFloat((selectedService.price * 1550).toFixed(2));
    
    // Validate price
    if (isNaN(priceNgn) || priceNgn <= 0) {
      return NextResponse.json(
        { error: 'Invalid price calculation' },
        { status: 500 }
      );
    }
    
    // Check balance
    const currentBalance = parseFloat(String(user.walletBalance)) || 0;
    if (currentBalance < priceNgn) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Need ₦${priceNgn.toFixed(2)}, Have ₦${currentBalance.toFixed(2)}`
        },
        { status: 400 }
      );
    }

    // Buy number from TigerSMS
    let order;
    try {
      order = await buyNumber(country, service);
    } catch (buyError: any) {
      return NextResponse.json(
        { error: `Failed to get number: ${buyError.message}` },
        { status: 400 }
      );
    }

    // Deduct wallet
    user.walletBalance = currentBalance - priceNgn;
    
    // Validate balance after deduction
    if (user.walletBalance < 0) {
      user.walletBalance = currentBalance;
      throw new Error('Balance validation failed');
    }
    
    await user.save();

    // Create transaction record
    await Transaction.create({
      userId,
      type: 'virtual_number',
      description: `TigerSMS: ${order.number} (${selectedService.name} - ${country})`,
      amount: priceNgn,
      status: 'success'
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      phoneNumber: order.number,
      service: selectedService.name,
      price: priceNgn,
      newBalance: user.walletBalance
    });
  } catch (e: any) {
    console.error('Buy number error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
