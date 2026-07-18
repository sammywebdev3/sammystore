import { NextResponse } from 'next/server';
import { createOrder as createHstoraOrder, getProduct as getHstoraProduct } from '@/lib/hstora';
import { getUserId } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { getMarkups, computeMarkup, toNgn } from '@/lib/pricing';
import crypto from 'crypto';

export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Please login' }, { status: 401 });

  const { productId, amount } = await request.json();
  const qty = parseInt(String(amount)) || 1;
  if (!productId || qty <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const idStr = String(productId);
  if (!idStr.startsWith('buyacc2_')) {
    return NextResponse.json({ success: false, error: 'Unknown product source' }, { status: 400 });
  }
  const rawId = idStr.replace(/^buyacc2_/, '');

  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  if (user.suspended) {
    return NextResponse.json({ success: false, error: 'Your account is suspended. Contact support.' }, { status: 403 });
  }

  let product;
  try {
    product = await getHstoraProduct(rawId);
  } catch {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 400 });
  }

  if (typeof product.stock_available === 'number' && product.stock_available <= 0) {
    return NextResponse.json({ success: false, error: 'This product is out of stock' }, { status: 400 });
  }
  if (typeof product.stock_available === 'number' && qty > product.stock_available) {
    return NextResponse.json(
      { success: false, error: `Only ${product.stock_available} available - please lower the quantity` },
      { status: 400 }
    );
  }

  const baseUnitPrice = product.price;
  if (isNaN(baseUnitPrice) || baseUnitPrice <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid product price' }, { status: 500 });
  }

  const markups = await getMarkups();
  // Trust HStora's own `currency` field rather than assuming USD - see the
  // matching fix in /api/logs/products.
  const baseUnitPriceNgn =
    product.currency && product.currency.toUpperCase() !== 'USD'
      ? baseUnitPrice
      : toNgn(baseUnitPrice);
  const unitPrice = computeMarkup(baseUnitPriceNgn, markups.accounts);
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
    // HStore requires a stable external_order_id + Idempotency-Key per
    // purchase attempt - a fresh UUID here means a genuine retry from the
    // client creates a new order rather than colliding with a past one.
    const externalOrderId = `sammystore-${userId}-${crypto.randomUUID()}`;
    const result = await createHstoraOrder(rawId, qty, externalOrderId);

    const items = result.delivery?.items || [];
    const accountData =
      items.length === 1
        ? { Account: items[0] }
        : Object.fromEntries(items.map((acc, i) => [`Account ${i + 1}`, acc]));

    const txn = await Transaction.create({
      userId,
      type: 'account_purchase',
      description: `Bought ${qty} x ${product.name}`,
      amount: cost,
      status: 'success',
      metadata: {
        productId,
        source: 'buyacc2',
        productName: product.name,
        category: null,
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
    console.error('HStora purchase failed:', providerError?.message || providerError);
    return NextResponse.json(
      { success: false, error: 'This item could not be delivered right now - your wallet has been refunded.' },
      { status: 400 }
    );
  }
}
