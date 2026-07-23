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
//
// Two provider channels are supported, per NeuraPay's docs:
//   - Paga:    no identity document required.
//   - PalmPay: requires the account owner's BVN or NIN (11-digit number),
//              sent as identity_type + license_number.
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

    const { amount, channel, identityType, identityNumber } = await request.json();

    const intendedAmount = parseFloat(String(amount));
    if (isNaN(intendedAmount) || intendedAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
    }

    const normalizedChannel = channel === 'palmpay' ? 'palmpay' : 'paga';

    if (normalizedChannel === 'palmpay') {
      if (identityType !== 'BVN' && identityType !== 'NIN') {
        return NextResponse.json({ success: false, error: 'Select BVN or NIN' }, { status: 400 });
      }
      if (!identityNumber || !/^\d{11}$/.test(String(identityNumber))) {
        return NextResponse.json({ success: false, error: 'Enter a valid 11-digit BVN or NIN' }, { status: 400 });
      }
    }

    const secretKey = process.env.NEURAPAY_SECRET_KEY;
    const businessId = process.env.NEURAPAY_BUSINESS_ID;
    if (!secretKey || !businessId) {
      return NextResponse.json({ success: false, error: 'NeuraPay is not configured' }, { status: 500 });
    }

    const reference = `SAMMY-NP-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;

    const payloadBody: Record<string, any> = {
      customer_name: user.name,
      customer_email: user.email,
      provider_channel: normalizedChannel === 'palmpay' ? 'Palmpay' : 'Paga',
      reference,
    };

    if (normalizedChannel === 'palmpay') {
      payloadBody.identity_type = identityType;
      payloadBody.license_number = String(identityNumber);
    }

    const response = await axios.post(`${NEURAPAY_BASE_URL}/virtual-accounts`, payloadBody, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'X-Business-Id': businessId,
      },
    });

    // Log the full raw response every time (not just on failure) so we can
    // confirm the real field names/behavior on the next test call.
    console.log('NeuraPay virtual-account creation response:', JSON.stringify(response.data));
    const payload = response.data?.data || response.data;
    const accountNumber = payload?.account_number || payload?.virtual_account || payload?.accountNumber;
    const bankName = payload?.bank_name || payload?.bankName || (normalizedChannel === 'palmpay' ? 'PalmPay' : 'Paga');
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
      description: `Wallet funding via NeuraPay/${bankName} (awaiting transfer of ₦${intendedAmount})`,
      amount: intendedAmount,
      status: 'pending',
      activationId: reference,
      metadata: { intendedAmount, accountNumber, bankName, accountName, channel: normalizedChannel },
    });

    return NextResponse.json({
      success: true,
      reference,
      intendedAmount,
      account: { accountNumber, bankName, accountName },
    });
  } catch (error: any) {
    // Surface NeuraPay's own business-logic error message when available
    // (e.g. "KYC verification is required", "The selected banking channel
    // is undergoing maintenance") instead of a generic failure - these are
    // actionable for the user/merchant, per NeuraPay's documented error set.
    const providerMessage = error.response?.data?.message;
    console.error('NeuraPay virtual account error:', error.response?.data || error.message);
    return NextResponse.json(
      { success: false, error: providerMessage || 'Could not generate a payment account' },
      { status: error.response?.status || 500 }
    );
  }
}
