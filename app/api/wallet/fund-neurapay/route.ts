import { NextResponse } from 'next/server';
import axios from 'axios';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { getUserId } from '@/lib/auth';

const NEURAPAY_BASE_URL = 'https://neurapay.com.ng/api/v1';

// NeuraPay virtual accounts don't take an amount at creation time - the
// account is generated for a customer/reference, and the customer can
// transfer whatever amount they want to it. We still ask the user for an
// intended amount here purely so we can show it back to them in the UI
// ("transfer ₦X to this account") - the actual wallet credit later uses
// whatever NeuraPay confirms was really received, not this number.
export async function POST(request: Request) {
  try {
    await dbConnect();

    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Please login' }, { status: 401 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const { amount } = await request.json();
    const intendedAmount = parseFloat(String(amount));
    if (isNaN(intendedAmount) || intendedAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
    }

    const secretKey = process.env.NEURAPAY_SECRET_KEY;
    const businessId = process.env.NEURAPAY_BUSINESS_ID;
    if (!secretKey || !businessId) {
      return NextResponse.json({ success: false, error: 'NeuraPay is not configured' }, { status: 500 });
    }

    const reference = `SAMMY-NP-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;

    const response = await axios.post(`${NEURAPAY_BASE_URL}/virtual-accounts`, {
      customer_name: user.name,
      customer_email: user.email,
      provider_channel: 'Paga',
      reference,
    }, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'X-Business-Id': businessId,
      },
    });

    // We don't know NeuraPay's exact response field names with certainty,
    // so we check a few plausible shapes rather than assuming one. If none
    // match, we fail loudly instead of showing the user a blank/broken
    // account number.
    const payload = response.data?.data || response.data;
    const accountNumber = payload?.account_number || payload?.virtual_account || payload?.accountNumber;
    const bankName = payload?.bank_name || payload?.bankName || 'Paga';
    const accountName = payload?.account_name || payload?.accountName || user.name;

    if (!accountNumber) {
      console.error('Unexpected NeuraPay virtual-account response shape:', response.data);
      return NextResponse.json(
        { success: false, error: 'Could not generate a payment account. Please try again or contact support.' },
        { status: 502 }
      );
    }

    // Pending transaction, keyed by reference. amount is a placeholder
    // (the intended amount) and gets overwritten with the real received
    // amount once payment is confirmed - see lib/neurapayCredit.ts.
    await Transaction.create({
      userId: user._id,
      type: 'wallet_fund',
      description: `Wallet funding via NeuraPay (awaiting transfer of ₦${intendedAmount})`,
      amount: intendedAmount,
      status: 'pending',
      activationId: reference,
      metadata: { intendedAmount, accountNumber, bankName, accountName },
    });

    return NextResponse.json({
      success: true,
      reference,
      intendedAmount,
      account: { accountNumber, bankName, accountName },
    });
  } catch (error: any) {
    console.error('NeuraPay virtual account error:', error.response?.data || error.message);
    return NextResponse.json({ success: false, error: 'Could not generate a payment account' }, { status: 500 });
  }
}
