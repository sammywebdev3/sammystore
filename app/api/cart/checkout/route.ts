import { NextResponse } from 'next/server';
import { getAllListings as getAccszoneListings, purchaseListing as purchaseAccszoneListing } from '@/lib/accszone';
import { getAllProducts as getHstoraProducts, createOrder as createHstoraOrder } from '@/lib/hstora';
import { japRequest } from '@/lib/jap';
import { getUserId } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import Cart from '@/models/Cart';
import { getMarkups, computeMarkup, toNgn } from '@/lib/pricing';
import crypto from 'crypto';

type CheckoutResult = { productId: string; name: string; success: boolean; error?: string };

export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Please login' }, { status: 401 });

  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  if (user.suspended) {
    return NextResponse.json({ success: false, error: 'Your account is suspended. Contact support.' }, { status: 403 });
  }

  const cart = await Cart.findOne({ userId });
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ success: false, error: 'Your cart is empty' }, { status: 400 });
  }

  const accountItems = cart.items.filter((i) => i.type !== 'smm');
  const smmItems = cart.items.filter((i) => i.type === 'smm');

  const markups = await getMarkups();
  const results: CheckoutResult[] = [];
  const remainingItems: typeof cart.items = [];

  if (accountItems.length > 0) {
    const accszoneItems = accountItems.filter((i) => String(i.productId).startsWith('buyacc1_'));
    const hstoraItems = accountItems.filter((i) => String(i.productId).startsWith('buyacc2_'));
    const unknownItems = accountItems.filter(
      (i) => !String(i.productId).startsWith('buyacc1_') && !String(i.productId).startsWith('buyacc2_')
    );

    for (const item of unknownItems) {
      results.push({ productId: item.productId, name: item.name, success: false, error: 'Unknown product source' });
      remainingItems.push(item);
    }

    if (accszoneItems.length > 0) {
      let liveListings: any[] = [];
      try {
        liveListings = await getAccszoneListings();
      } catch {}

      for (const item of accszoneItems) {
        const rawId = String(item.productId).replace(/^buyacc1_/, '');
        const liveListing = liveListings.find((l: any) => String(l.id) === String(rawId));

        if (!liveListing) {
          results.push({ productId: item.productId, name: item.name, success: false, error: 'No longer available' });
          remainingItems.push(item);
          continue;
        }

        if (typeof liveListing.available_stock === 'number' && item.quantity > liveListing.available_stock) {
          results.push({
            productId: item.productId,
            name: item.name,
            success: false,
            error: `Only ${liveListing.available_stock} available`,
          });
          remainingItems.push(item);
          continue;
        }

        const baseUnitPriceUsd = parseFloat(String(liveListing.price));
        if (isNaN(baseUnitPriceUsd) || baseUnitPriceUsd <= 0) {
          results.push({ productId: item.productId, name: item.name, success: false, error: 'Invalid product price' });
          remainingItems.push(item);
          continue;
        }

        const unitPrice = computeMarkup(toNgn(baseUnitPriceUsd), markups.accounts);
        const cost = unitPrice * item.quantity;

        const debited = await User.findOneAndUpdate(
          { _id: userId, walletBalance: { $gte: cost } },
          { $inc: { walletBalance: -cost } },
          { new: true }
        );

        if (!debited) {
          results.push({ productId: item.productId, name: item.name, success: false, error: 'Insufficient funds' });
          remainingItems.push(item);
          continue;
        }

        let purchaseResult;
        try {
          purchaseResult = await purchaseAccszoneListing(rawId, item.quantity);
        } catch {
          await User.findByIdAndUpdate(userId, { $inc: { walletBalance: cost } });
          results.push({ productId: item.productId, name: item.name, success: false, error: 'Purchase failed, refunded' });
          remainingItems.push(item);
          continue;
        }

        try {
          await Transaction.create({
            userId,
            type: 'account_purchase',
            description: `Bought ${item.quantity} x ${item.name}`,
            amount: cost,
            status: 'success',
            metadata: {
              productId: item.productId,
              source: 'buyacc1',
              productName: item.name,
              category: item.category || null,
              quantity: item.quantity,
              // One entry per account, not a single joined blob - see
              // matching note in api/accounts/buy/route.ts.
              accountData:
                purchaseResult.accounts.length === 1
                  ? { Account: purchaseResult.accounts[0] }
                  : Object.fromEntries(purchaseResult.accounts.map((acc, i) => [`Account ${i + 1}`, acc])),
            },
          });
        } catch (txError) {
          console.error('Failed to record account Transaction after successful purchase:', txError);
        }

        results.push({ productId: item.productId, name: item.name, success: true });
      }
    }

    if (hstoraItems.length > 0) {
      let liveProducts: any[] = [];
      try {
        liveProducts = await getHstoraProducts();
      } catch {}

      for (const item of hstoraItems) {
        const rawId = String(item.productId).replace(/^buyacc2_/, '');
        const liveProduct = liveProducts.find((p: any) => String(p.id) === String(rawId));

        if (!liveProduct) {
          results.push({ productId: item.productId, name: item.name, success: false, error: 'No longer available' });
          remainingItems.push(item);
          continue;
        }

        if (typeof liveProduct.stock_available === 'number' && item.quantity > liveProduct.stock_available) {
          results.push({
            productId: item.productId,
            name: item.name,
            success: false,
            error: `Only ${liveProduct.stock_available} available`,
          });
          remainingItems.push(item);
          continue;
        }

        const baseUnitPrice = liveProduct.price;
        if (isNaN(baseUnitPrice) || baseUnitPrice <= 0) {
          results.push({ productId: item.productId, name: item.name, success: false, error: 'Invalid product price' });
          remainingItems.push(item);
          continue;
        }

        // Trust HStora's own `currency` field rather than assuming USD -
        // see the matching fix in /api/logs/products.
        const baseUnitPriceNgn =
          liveProduct.currency && String(liveProduct.currency).toUpperCase() !== 'USD'
            ? baseUnitPrice
            : toNgn(baseUnitPrice);
        const unitPrice = computeMarkup(baseUnitPriceNgn, markups.accounts);
        const cost = unitPrice * item.quantity;

        const debited = await User.findOneAndUpdate(
          { _id: userId, walletBalance: { $gte: cost } },
          { $inc: { walletBalance: -cost } },
          { new: true }
        );

        if (!debited) {
          results.push({ productId: item.productId, name: item.name, success: false, error: 'Insufficient funds' });
          remainingItems.push(item);
          continue;
        }

        let purchaseResult;
        try {
          const externalOrderId = `sammystore-${userId}-${crypto.randomUUID()}`;
          purchaseResult = await createHstoraOrder(rawId, item.quantity, externalOrderId);
        } catch {
          await User.findByIdAndUpdate(userId, { $inc: { walletBalance: cost } });
          results.push({ productId: item.productId, name: item.name, success: false, error: 'Purchase failed, refunded' });
          remainingItems.push(item);
          continue;
        }

        try {
          const deliveredItems = purchaseResult.delivery?.items || [];
          await Transaction.create({
            userId,
            type: 'account_purchase',
            description: `Bought ${item.quantity} x ${item.name}`,
            amount: cost,
            status: 'success',
            metadata: {
              productId: item.productId,
              source: 'buyacc2',
              productName: item.name,
              category: item.category || null,
              quantity: item.quantity,
              accountData:
                deliveredItems.length === 1
                  ? { Account: deliveredItems[0] }
                  : Object.fromEntries(deliveredItems.map((acc: string, i: number) => [`Account ${i + 1}`, acc])),
            },
          });
        } catch (txError) {
          console.error('Failed to record account Transaction after successful purchase:', txError);
        }

        results.push({ productId: item.productId, name: item.name, success: true });
      }
    }
  }

  if (smmItems.length > 0) {
    let liveServices: any[] = [];
    try {
      const smmData = await japRequest('services');
      liveServices = Array.isArray(smmData) ? smmData : [];
    } catch {}

    for (const item of smmItems) {
      const liveService = liveServices.find((s: any) => String(s.service) === String(item.productId));

      if (!liveService) {
        results.push({ productId: item.productId, name: item.name, success: false, error: 'Service no longer available' });
        remainingItems.push(item);
        continue;
      }

      const baseCostUsd = (parseFloat(liveService.rate) * item.quantity) / 1000;
      if (isNaN(baseCostUsd) || baseCostUsd <= 0) {
        results.push({ productId: item.productId, name: item.name, success: false, error: 'Invalid price' });
        remainingItems.push(item);
        continue;
      }
      const cost = computeMarkup(toNgn(baseCostUsd), markups.smm);

      const debited = await User.findOneAndUpdate(
        { _id: userId, walletBalance: { $gte: cost } },
        { $inc: { walletBalance: -cost } },
        { new: true }
      );

      if (!debited) {
        results.push({ productId: item.productId, name: item.name, success: false, error: 'Insufficient funds' });
        remainingItems.push(item);
        continue;
      }

      let order;
      try {
        order = await japRequest('add', {
          service: item.productId,
          link: item.link,
          quantity: item.quantity.toString(),
        });
      } catch (providerError: any) {
        await User.findByIdAndUpdate(userId, { $inc: { walletBalance: cost } });
        results.push({ productId: item.productId, name: item.name, success: false, error: 'Order failed, refunded' });
        remainingItems.push(item);
        continue;
      }

      try {
        await Transaction.create({
          userId,
          type: 'smm',
          description: `SMM order: ${item.name} x${item.quantity}`,
          amount: cost,
          status: 'success',
          activationId: String(order.order),
        });
      } catch (txError) {
        console.error('Failed to record SMM Transaction after successful order:', txError);
      }

      results.push({ productId: item.productId, name: item.name, success: true });
    }
  }

  cart.items = remainingItems;
  await cart.save();

  const finalUser = await User.findById(userId);
  const allSucceeded = results.every((r) => r.success);

  return NextResponse.json({
    success: allSucceeded,
    partial: !allSucceeded && results.some((r) => r.success),
    results,
    newBalance: finalUser?.walletBalance ?? null,
  });
}
