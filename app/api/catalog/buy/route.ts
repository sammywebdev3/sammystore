import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getUserId } from '@/lib/auth';
import User from '@/models/User';
import CatalogProduct from '@/models/CatalogProduct';
import CatalogItem from '@/models/CatalogItem';
import Transaction from '@/models/Transaction';

export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Please login' }, { status: 401 });

  const { productId } = await request.json();
  if (!productId) return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });

  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  if (user.suspended) {
    return NextResponse.json({ success: false, error: 'Your account is suspended. Contact support.' }, { status: 403 });
  }

  const product = await CatalogProduct.findById(productId);
  if (!product || !product.active) {
    return NextResponse.json({ success: false, error: 'Product not found or unavailable' }, { status: 404 });
  }

  const item = await CatalogItem.findOneAndUpdate(
    { productId, status: 'available' },
    { $set: { status: 'sold', soldTo: userId, soldAt: new Date() } },
    { new: true }
  );

  if (!item) {
    return NextResponse.json({ success: false, error: 'This product is out of stock' }, { status: 400 });
  }

  const debited = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: product.price } },
    { $inc: { walletBalance: -product.price } },
    { new: true }
  );

  if (!debited) {
    await CatalogItem.findByIdAndUpdate(item._id, {
      $set: { status: 'available' },
      $unset: { soldTo: '', soldAt: '' },
    });
    return NextResponse.json({ success: false, error: 'Insufficient funds' }, { status: 400 });
  }

  const txn = await Transaction.create({
    userId,
    type: 'account_purchase',
    description: `Bought ${product.name}`,
    amount: product.price,
    status: 'success',
    metadata: {
      source: 'catalog',
      productId: String(product._id),
      productName: product.name,
      category: product.category,
      accountData: { Details: item.credentials },
      instructions: product.instructions || null,
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Purchase successful!',
    credentials: item.credentials,
    newBalance: debited.walletBalance,
    orderId: String(txn._id),
  });
}
