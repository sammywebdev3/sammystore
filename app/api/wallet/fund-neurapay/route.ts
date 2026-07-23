import { NextResponse } from 'next/server';
import axios from 'axios';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserId } from '@/lib/auth';

const NEURAPAY_BASE_URL = 'https://neurapay.com.ng/api/v1';

// NeuraPay virtual accounts are PERSISTENT per customer, not per-payment -
// the same account number stays valid for repeated transfers. So this
// route generates an account ONCE per user per channel, saves it on the
// User document, and every subsequent call just returns the saved one
// instead of calling NeuraPay again. Crediting is handled entirely by the
// webhook/manual-check matching on this fixed account number - see
// lib/neurapayCredit.ts.
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

    const { channel, identityType, identityNumber } = await request.json();
    const normalizedChannel: 'paga' | 'palmpay' = channel === 'palmpay' ? 'palmpay' : 'paga';

    // Already have one for this channel - just hand it back, no API call.
    const existing = user.neurapayAccounts?.[normalizedChannel];
    if (existing?.accountNumber) {
      return NextResponse.json({ success: true, account: existing, reused: true });
    }

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

    // Reference here just identifies THIS creation request to NeuraPay -
    // it's not used later for matching payments, since the account itself
    // (not a reference) is what's persistent and what the webhook matches.
    const creationReference = `SAMMY-NP-ACC-${user._id}-${normalizedChannel}`;

    const payloadBody: Record<string, any> = {
      customer_name: user.name,
      customer_email: user.email,
      provider_channel: normalizedChannel === 'palmpay' ? 'Palmpay' : 'Paga',
      reference: creationReference,
    };

    if (normalizedChannel === 'palmpay') {
      // NeuraPay's documented example uses the fixed value "personal" for
      // an individual account owner - the BVN/NIN choice is about which
      // kind of number goes into license_number, not this field.
      payloadBody.identity_type = 'personal';
      payloadBody.license_number = String(identityNumber);
    }

    const response = await axios.post(`${NEURAPAY_BASE_URL}/virtual-accounts`, payloadBody, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'X-Business-Id': businessId,
      },
    });

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

    const account = { accountNumber, bankName, accountName };

    // Save permanently on the user - this is what makes it persistent.
    // Using dot-notation update (not a full re-save) so a concurrent
    // request for the OTHER channel can't clobber it.
    await User.findByIdAndUpdate(user._id, {
      $set: { [`neurapayAccounts.${normalizedChannel}`]: account },
    });

    return NextResponse.json({ success: true, account, reused: false });
  } catch (error: any) {
    const providerMessage = error.response?.data?.message;
    console.error('NeuraPay virtual account error:', error.response?.data || error.message);
    return NextResponse.json(
      { success: false, error: providerMessage || 'Could not generate a payment account' },
      { status: error.response?.status || 500 }
    );
  }
}
