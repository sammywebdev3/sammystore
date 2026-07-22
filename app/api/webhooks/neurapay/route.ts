import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import { creditNeurapayTransaction } from '@/lib/neurapayCredit';

// NeuraPay calls this URL when a virtual account receives an inbound
// transfer. We MUST verify the signature before trusting the payload -
// anyone on the internet can otherwise POST a fake "payment.successful"
// event and get free wallet credit.
export async function POST(request: Request) {
  const signingSecret = process.env.NEURAPAY_WEBHOOK_SECRET;
  if (!signingSecret) {
    console.error('NEURAPAY_WEBHOOK_SECRET is not set - rejecting webhook');
    return NextResponse.json({ status: 'error', message: 'Webhook not configured' }, { status: 500 });
  }

  // Read the raw body text - signature verification has to run against
  // the exact bytes NeuraPay sent, not a re-serialized JSON.parse() of it.
  const rawBody = await request.text();
  const receivedSignature = request.headers.get('x-neurapay-signature') || '';

  const expectedSignature = crypto
    .createHmac('sha256', signingSecret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
  const receivedBuf = Buffer.from(receivedSignature, 'utf-8');

  const isVerified =
    expectedBuf.length === receivedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, receivedBuf);

  if (!isVerified) {
    console.error('NeuraPay webhook signature mismatch - rejecting');
    return NextResponse.json({ status: 'error', message: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid JSON' }, { status: 400 });
  }

  // Acknowledge anything that isn't a successful inbound payment so
  // NeuraPay doesn't keep retrying events we don't act on.
  if (event?.event !== 'payment.successful') {
    return NextResponse.json({ status: 'success' });
  }

  const { reference, amount, net_amount, provider_reference } = event.data || {};
  if (!reference) {
    return NextResponse.json({ status: 'error', message: 'Missing reference' }, { status: 400 });
  }

  try {
    await dbConnect();
    await creditNeurapayTransaction({
      reference,
      grossAmount: Number(amount) || 0,
      netAmount: Number(net_amount) || Number(amount) || 0,
      providerReference: provider_reference,
    });
    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    // Log and still return 200-ish so NeuraPay doesn't hammer retries for
    // a reference we simply don't recognize (e.g. a stale/test event) -
    // but do surface real errors in our own logs either way.
    console.error('NeuraPay webhook processing error:', err.message);
    return NextResponse.json({ status: 'success', note: 'logged, not credited' });
  }
}
