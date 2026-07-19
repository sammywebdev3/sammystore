import { NextResponse } from 'next/server';
import { getAllProducts, purchaseProduct } from '@/lib/benotp-accounts';
import { getUserId } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { getMarkups, computeMarkup, toNgn } from '@/lib/pricing';

// buyacc1 (BenOTP) - buyacc2 (HStora) purchases go through /api/logs/buy
// instead, matching the /accounts vs /logs page split.
export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Please login' }, { status: 401 });

  const { productId, amount, coupon } = await request.json();
  const qty = parseInt(String(amount)) || 1;
  if (!productId || qty <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const idStr = String(productId);
  if (!idStr.startsWith('buyacc1_')) {
    return NextResponse.json({ success: false, error: 'Unknown product source' }, { status: 400 });
  }
  const rawId = idStr.replace(/^buyacc1_/, '');

  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  if (user.suspended) {
    return NextResponse.json({ success: false, error: 'Your account is suspended. Contact support.' }, { status: 403 });
  }

  const listings = await getAllProducts();
  const listing = listings.find((l: any) => String(l.id) === String(rawId));

  if (!listing) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 400 });
  }

  const stock = listing.amount !== undefined && listing.amount !== null ? parseInt(String(listing.amount), 10) : null;
  if (typeof stock === 'number' && stock <= 0) {
    return NextResponse.json({ success: false, error: 'This product is out of stock' }, { status: 400 });
  }
  if (typeof stock === 'number' && qty > stock) {
    return NextResponse.json(
      { success: false, error: `Only ${stock} available - please lower the quantity` },
      { status: 400 }
    );
  }

  const baseUnitPriceUsd = parseFloat(String(listing.price));
  if (isNaN(baseUnitPriceUsd) || baseUnitPriceUsd <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid product price' }, { status: 500 });
  }

  const markups = await getMarkups();
  const unitPrice = computeMarkup(toNgn(baseUnitPriceUsd), markups.accounts);
  const cost = unitPrice * qty;

  const debited = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: cost } },
    { $inc: { walletBalance: -cost } },
    { new: true }
  );

  if (!debited) {
    return NextResponse.json({ success: false, error: 'Insufficient funds' }, { status: 400 });
  }

  try {
    const result = await purchaseProduct(rawId, qty, coupon || undefined);

    // Response shape for buyProduct isn't documented with an example yet -
    // being lenient about where delivered account data lives until a real
    // response is captured and this can be tightened.
    const delivered = result?.data ?? result?.accounts ?? null;
    const accountData = Array.isArray(delivered)
      ? (delivered.length === 1
          ? { Account: delivered[0] }
          : Object.fromEntries(delivered.map((acc: any, i: number) => [`Account ${i + 1}`, acc])))
      : delivered && typeof delivered === 'object'
      ? delivered
      : { Account: delivered };

    const txn = await Transaction.create({
      userId,
      type: 'account_purchase',
      description: `Bought ${qty} x ${listing.name}`,
      amount: cost,
      status: 'success',
      metadata: {
        productId,
        source: 'buyacc1',
        productName: listing.name,
        category: listing.categoryName || null,
        quantity: qty,
        accountData,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Purchase successful!',
      accountData,
      newBalance: debited.walletBalance,
      orderId: String(txn._id),
    });
  } catch (providerError: any) {
    await User.findByIdAndUpdate(userId, { $inc: { walletBalance: cost } });
    console.error('BenOTP purchase failed:', providerError?.message || providerError);
    return NextResponse.json(
      { success: false, error: 'This item could not be delivered right now - your wallet has been refunded.' },
      { status: 400 }
    );
  }
}
