import { NextResponse } from 'next/server';
import { getNumber, cancelNumber, poolLabel, getServices, getAll1Price, BenotpPool } from '@/lib/benotp';
import { getBenotpPrices, getMarkups, toNgn, computeMarkup } from '@/lib/pricing';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { getUserId } from '@/lib/auth';

const VALID_POOLS: BenotpPool[] = ['usa1', 'usa2', 'all1', 'all2'];

// usa1/usa2/all1 now have live per-service pricing (see lib/benotp.ts) - the
// numbers page shows a real price for each specific service before purchase,
// so this route must charge that same price, not a flat per-pool number.
// Charging flat here while the UI quotes live per-service prices was a real
// bug: two customers picking different-priced services from the same pool
// would see different quotes but pay the identical flat amount.
// all2 stays on the flat admin-set price - its getPrices response is
// malformed on BenOTP's side as of 2026-07-18, so there's no live price to
// trust yet (see notes in lib/benotp.ts).
async function resolveLivePriceNgn(
  pool: BenotpPool,
  service: string,
  country: string | undefined,
  areaCode: string | undefined
): Promise<number | null> {
  const markups = await getMarkups();

  if (pool === 'usa1' || pool === 'usa2') {
    const services = await getServices(pool);
    const match = services.find((s) => s.service === service);
    if (!match) return null;
    if (match.available === false) return null;
    return computeMarkup(toNgn(match.price), markups.numbers);
  }

  if (pool === 'all1') {
    if (!country) return null;
    const quote = await getAll1Price(service, country, areaCode);
    if (!quote || quote.price <= 0 || quote.count <= 0) return null;
    return computeMarkup(toNgn(quote.price), markups.numbers);
  }

  return null; // all2 falls back to flat pricing below
}

export async function POST(request: Request) {
  await dbConnect();

  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { pool, service, country, areaCode, carrier } = await request.json();
  if (!pool || !VALID_POOLS.includes(pool) || !service) {
    return NextResponse.json({ error: 'Pool and service are required' }, { status: 400 });
  }

  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (user.suspended) {
    return NextResponse.json({ error: 'Your account is suspended. Contact support.' }, { status: 403 });
  }

  try {
    let priceNgn: number | null = null;
    try {
      priceNgn = await resolveLivePriceNgn(pool, service, country, areaCode);
    } catch (priceError: any) {
      console.error(`BenOTP live price lookup failed (${pool}/${service}):`, priceError?.message || priceError);
      priceNgn = null;
    }

    // Live lookup failed, service not found, or pool is all2 (no live
    // pricing yet) - fall back to the flat admin-set price rather than
    // blocking the purchase outright.
    if (priceNgn === null) {
      const flatPrices = await getBenotpPrices();
      priceNgn = flatPrices[pool];
    }

    if (!priceNgn || priceNgn <= 0) {
      return NextResponse.json({ error: 'Pricing not available for this service right now' }, { status: 400 });
    }

    // Same atomic check-and-deduct pattern used for TigerSMS/AccsZone -
    // avoids the balance-race issue those were fixed for.
    const debited = await User.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: priceNgn } },
      { $inc: { walletBalance: -priceNgn } },
      { new: true }
    );

    if (!debited) {
      const currentBalance = parseFloat(String(user.walletBalance)) || 0;
      return NextResponse.json(
        { error: `Insufficient balance. Need ₦${priceNgn.toFixed(2)}, Have ₦${currentBalance.toFixed(2)}` },
        { status: 400 }
      );
    }

    let order;
    try {
      order = await getNumber(pool, { service, country, areaCode, carrier });
    } catch (buyError: any) {
      await User.findByIdAndUpdate(userId, { $inc: { walletBalance: priceNgn } });
      console.error('BenOTP purchase failed:', buyError?.message || buyError);
      return NextResponse.json(
        { error: 'Could not get a number from this pool right now - your wallet has been refunded.' },
        { status: 400 }
      );
    }

    try {
      await Transaction.create({
        userId,
        type: 'virtual_number',
        description: `BenOTP ${poolLabel(pool)}: ${order.phoneNumber} (${service})`,
        amount: priceNgn,
        status: 'success',
        activationId: order.activationId,
        metadata: { provider: 'benotp', pool },
      });
    } catch (txError: any) {
      console.error('Failed to record transaction after successful BenOTP purchase:', txError);
      await User.findByIdAndUpdate(userId, { $inc: { walletBalance: priceNgn } });
      try {
        await cancelNumber(pool, order.activationId);
      } catch (cancelError) {
        console.error('Failed to cancel BenOTP activation during rollback:', cancelError);
      }
      return NextResponse.json({ error: 'Could not complete purchase, please try again' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId: order.activationId,
      phoneNumber: order.phoneNumber,
      pool,
      price: priceNgn,
      newBalance: debited.walletBalance,
    });
  } catch (e: any) {
    console.error('BenOTP buy number error:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
