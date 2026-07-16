import { NextResponse } from 'next/server';
import { purchaseListing, getAllListings } from '@/lib/accszone';
import { getUserId } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { getMarkups, computeMarkup, toNgn } from '@/lib/pricing';

async function handleAccszonePurchase(productId: string, qty: number, coupon: string | undefined, userId: string) {
  const rawId = productId.replace(/^accszone_/, '');

  const listings = await getAllListings();
  const listing = listings.find((l: any) => String(l.id) === String(rawId));

  if (!listing) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 400 });
  }

  if (typeof listing.available_stock === 'number' && listing.available_stock <= 0) {
    return NextResponse.json({ success: false, error: 'This product is out of stock' }, { status: 400 });
  }
  if (typeof listing.available_stock === 'number' && qty > listing.available_stock) {
    return NextResponse.json(
      { success: false, error: `Only ${listing.available_stock} available - please lower the quantity` },
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
    const result = await purchaseListing(rawId, qty, coupon || undefined);

    // One entry per account purchased - not a single newline-joined blob -
    // so a multi-quantity order shows each account in its own labeled,
    // individually-copyable box on the Orders page instead of everything
    // mashed together under one "Accounts" field.
    const accountData =
      result.accounts.length === 1
        ? { Account: result.accounts[0] }
        : Object.fromEntries(result.accounts.map((acc, i) => [`Account ${i + 1}`, acc]));

    const txn = await Transaction.create({
      userId,
      type: 'account_purchase',
      description: `Bought ${qty} x ${listing.title}`,
      amount: cost,
      status: 'success',
      metadata: {
        productId,
        source: 'accszone',
        productName: listing.title,
        category: listing.subcategory?.title || listing.category?.title || null,
        quantity: qty,
        accountData,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Purchase successful!',
      accountData,
      newBalance: debited.walletBalance,
      orderId: String(txn._id)
    });
  } catch (providerError: any) {
    await User.findByIdAndUpdate(userId, { $inc: { walletBalance: cost } });
    // Log the real provider error server-side for the admin to act on (e.g.
    // AccsZone reseller balance running out) - but never show the customer
    // the raw message, since it can contain our USD supplier cost/balance,
    // not anything about their own NGN wallet.
    console.error('AccsZone purchase failed:', providerError?.message || providerError);
    return NextResponse.json(
      { success: false, error: 'This item could not be delivered right now - your wallet has been refunded.' },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Please login' }, { status: 401 });

  const { productId, amount, coupon } = await request.json();
  const qty = parseInt(String(amount)) || 1;
  if (!productId || qty <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  if (user.suspended) return NextResponse.json({ success: false, error: 'Your account is suspended. Contact support.' }, { status: 403 });

  const idStr = String(productId);

  try {
    if (idStr.startsWith('accszone_')) {
      return await handleAccszonePurchase(idStr, qty, coupon, userId);
    }
    return NextResponse.json({ success: false, error: 'Unknown product source' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
