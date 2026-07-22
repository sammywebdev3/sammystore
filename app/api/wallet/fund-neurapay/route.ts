import { NextResponse } from 'next/server';
import axios from 'axios';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { getUserId } from '@/lib/auth';

const NEURAPAY_BASE_URL = 'https://neurapay.com.ng/api/v1';

export async function POST(request: Request) {
  try {
    await dbConnect();

    // Identify the user from their auth token - never trust a client-supplied
    // userId/email, since that would let someone initialize a payment tagged
    // with a different account than the one actually paying.
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Please login' }, { status: 401 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const { amount } = await request.json();
    const validAmount = parseFloat(String(amount));
    if (isNaN(validAmount) || validAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
    }

    const secretKey = process.env.NEURAPAY_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ success: false, error: 'NeuraPay is not configured' }, { status: 500 });
    }

    const businessId = process.env.NEURAPAY_BUSINESS_ID;
    if (!businessId) {
      return NextResponse.json({ success: false, error: 'NeuraPay is not configured' }, { status: 500 });
    }

    // Unique, hard-to-guess reference so we can verify this exact transaction
    // later and so two initializations never collide. Prefixed with "NP" so
    // the fund callback page can tell at a glance which gateway to verify
    // against without needing an extra DB round trip.
    const reference = `SAMMY-NP-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

    const response = await axios.post(`${NEURAPAY_BASE_URL}/payment/initialize`, {
      business_id: businessId,
      amount: Math.round(validAmount * 100), // NeuraPay uses kobo
      currency: 'NGN',
      email: user.email,
      reference,
      callback_url: `${siteUrl}/fund/callback`,
      metadata: { userId: String(user._id) }
    }, {
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' }
    });

    // Record a pending transaction now so verify-neurapay has something to
    // check against - this is what stops anyone from crediting a wallet
    // without an actual successful NeuraPay payment.
    await Transaction.create({
      userId: user._id,
      type: 'wallet_fund',
      description: `Wallet funding via NeuraPay (₦${validAmount})`,
      amount: validAmount,
      status: 'pending',
      activationId: reference
    });

    return NextResponse.json({
      success: true,
      url: response.data.data.authorization_url,
      reference
    });
  } catch (error: any) {
    console.error('NeuraPay init error:', error.response?.data || error.message);
    return NextResponse.json({ success: false, error: 'Payment initialization failed' }, { status: 500 });
  }
}
