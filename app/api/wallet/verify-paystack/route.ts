import { NextResponse } from 'next/server';
import axios from 'axios';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { getUserId } from '@/lib/auth';

// Completes a Paystack funding flow. Paystack redirects the user back to
// our callback page with the reference in the URL, but a redirect alone is
// NOT proof of payment (anyone can hit this URL manually). We only trust
// Paystack's own server-to-server verification response, and we only credit
// the wallet once per reference no matter how many times this is called.

// One-time welcome bonus credited on a user's first successful deposit.
const WELCOME_BONUS_AMOUNT = 500;

export async function POST(request: Request) {
  try {
    await dbConnect();

    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Please login' }, { status: 401 });
    }

    const { reference } = await request.json();
    if (!reference || typeof reference !== 'string') {
      return NextResponse.json({ success: false, error: 'Reference required' }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ success: false, error: 'Paystack is not configured' }, { status: 500 });
    }

    // The pending transaction we created at initialization time. Scoping the
    // lookup to this userId as well as the reference stops one user from
    // ever verifying/consuming another user's transaction record.
    const txn = await Transaction.findOne({ activationId: reference, userId, type: 'wallet_fund' });
    if (!txn) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    // Idempotency: if this was already credited (e.g. user revisits the
    // callback page, or double-clicks), don't credit it again.
    if (txn.status === 'success') {
      const user = await User.findById(userId);
      return NextResponse.json({ success: true, alreadyProcessed: true, newBalance: user?.walletBalance ?? 0 });
    }

    const verifyRes = await axios.get(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` }
    });

    const data = verifyRes.data?.data;
    const paidKobo = data?.amount;
    const expectedKobo = Math.round(txn.amount * 100);

    if (!data || data.status !== 'success') {
      txn.status = 'failed';
      await txn.save();
      return NextResponse.json({ success: false, error: 'Payment was not successful' }, { status: 400 });
    }

    // Guard against a tampered/mismatched amount - only credit exactly what
    // Paystack confirms was actually paid for this reference.
    if (paidKobo !== expectedKobo) {
      txn.status = 'failed';
      txn.description += ' (amount mismatch - not credited)';
      await txn.save();
      return NextResponse.json({ success: false, error: 'Amount mismatch' }, { status: 400 });
    }

    // Atomic credit + mark-success, guarded so a second concurrent call
    // (e.g. double network retry) can't double-credit even in a race.
    const updatedTxn = await Transaction.findOneAndUpdate(
      { _id: txn._id, status: { $ne: 'success' } },
      { $set: { status: 'success' } },
      { new: true }
    );

    if (!updatedTxn) {
      const user = await User.findById(userId);
      return NextResponse.json({ success: true, alreadyProcessed: true, newBalance: user?.walletBalance ?? 0 });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { walletBalance: txn.amount } },
      { new: true }
    );

    // Welcome bonus: credited once, only on the user's first-ever successful
    // deposit. We count successful wallet_fund transactions AFTER this one
    // was marked success above, so a count of exactly 1 means this deposit
    // is the first - any earlier deposit means the bonus was already given
    // (or never applicable) and we skip it.
    let bonusAwarded = false;
    let finalBalance = user?.walletBalance ?? 0;

    const successfulDepositCount = await Transaction.countDocuments({
      userId,
      type: 'wallet_fund',
      status: 'success',
    });

    if (successfulDepositCount === 1) {
      // Guard against double-award: create the bonus transaction first with
      // a deterministic reference tied to this user, so a concurrent/retried
      // request can't create two bonus transactions (unique+sparse index on
      // `reference` rejects the second insert).
      try {
        await Transaction.create({
          userId,
          type: 'welcome_bonus',
          description: 'Welcome bonus for first deposit',
          amount: WELCOME_BONUS_AMOUNT,
          status: 'success',
          reference: `welcome-bonus-${userId}`,
        });

        const bonusedUser = await User.findByIdAndUpdate(
          userId,
          { $inc: { walletBalance: WELCOME_BONUS_AMOUNT } },
          { new: true }
        );

        bonusAwarded = true;
        finalBalance = bonusedUser?.walletBalance ?? finalBalance;
      } catch (bonusError: any) {
        // Duplicate key error (E11000) means the bonus was already awarded
        // by a concurrent request - safe to ignore, not a real failure.
        if (bonusError?.code !== 11000) {
          console.error('Welcome bonus error:', bonusError.message);
        }
      }
    }

    return NextResponse.json({ success: true, newBalance: finalBalance, bonusAwarded });
  } catch (error: any) {
    console.error('Paystack verify error:', error.response?.data || error.message);
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}
