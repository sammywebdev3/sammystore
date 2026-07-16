import { NextResponse } from 'next/server';
import { buyNumber, getPrices, cancelActivation } from '@/lib/tigerSms';
import { toNgn, getMarkups, computeMarkup } from '@/lib/pricing';
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

  if (user.suspended) {
    return NextResponse.json(
      { error: 'Your account is suspended. Contact support.' },
      { status: 403 }
    );
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
    
    // Convert to NGN (Nigerian Naira) using the shared rate so this can
    // never drift from what the frontend quoted the user, then add the
    // admin-configured markup on top of raw provider cost - this is what
    // actually earns a margin instead of reselling at exact cost.
    const markups = await getMarkups();
    const priceNgn = computeMarkup(toNgn(selectedService.price), markups.numbers);
    
    // Validate price
    if (isNaN(priceNgn) || priceNgn <= 0) {
      return NextResponse.json(
        { error: 'Invalid price calculation' },
        { status: 500 }
      );
    }

    // Atomically check-and-deduct in a single DB operation. Doing the
    // balance check and the save() as two separate steps (the previous
    // implementation) is a classic TOCTOU race: two concurrent buy
    // requests can both read the same balance before either writes,
    // letting a user spend more than they actually have. The condition
    // on walletBalance below means only one concurrent request can ever
    // succeed against a given balance.
    const debited = await User.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: priceNgn } },
      { $inc: { walletBalance: -priceNgn } },
      { new: true }
    );

    if (!debited) {
      const currentBalance = parseFloat(String(user.walletBalance)) || 0;
      return NextResponse.json(
        {
          error: `Insufficient balance. Need ₦${priceNgn.toFixed(2)}, Have ₦${currentBalance.toFixed(2)}`
        },
        { status: 400 }
      );
    }

    // Buy number from TigerSMS. If this fails, refund the already-debited
    // balance immediately instead of leaving the user out of pocket.
    let order;
    try {
      order = await buyNumber(country, service);
      // fixedPrice is no longer enforced (see lib/tigerSms.ts), so log any
      // meaningful drift between what we quoted/charged and what TigerSMS
      // actually billed, purely for monitoring - doesn't affect the user.
      if (order.providerCost !== null && Math.abs(order.providerCost - selectedService.price) > 0.01) {
        console.warn(
          `[TigerSMS] Price drift on ${service}/${country}: quoted ${selectedService.price}, provider charged ${order.providerCost}`
        );
      }
    } catch (buyError: any) {
      await User.findByIdAndUpdate(userId, { $inc: { walletBalance: priceNgn } });
      return NextResponse.json(
        { error: `Failed to get number: ${buyError.message}` },
        { status: 400 }
      );
    }

    // Create transaction record. If this fails, the number was still
    // issued and the wallet still debited correctly (that part is done
    // and correct) - but we've lost the audit trail and the ability to
    // verify ownership when checking the SMS status. Try to cancel the
    // activation and refund so the user isn't charged for an order with
    // no record, rather than silently losing the money.
    try {
      await Transaction.create({
        userId,
        type: 'virtual_number',
        description: `TigerSMS: ${order.number} (${selectedService.name} - ${country})`,
        amount: priceNgn,
        status: 'success',
        activationId: order.id
      });
    } catch (txError: any) {
      console.error('Failed to record transaction after successful purchase:', txError);
      await User.findByIdAndUpdate(userId, { $inc: { walletBalance: priceNgn } });
      try {
        await cancelActivation(order.id);
      } catch (cancelError) {
        console.error('Failed to cancel activation during rollback:', cancelError);
      }
      return NextResponse.json(
        { error: 'Could not complete purchase, please try again' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      phoneNumber: order.number,
      service: selectedService.name,
      price: priceNgn,
      newBalance: debited.walletBalance
    });
  } catch (e: any) {
    console.error('Buy number error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
