import { NextResponse } from 'next/server';
import { getBalance } from '@/lib/tigerSms';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const balance = await getBalance();
    return NextResponse.json({ success: true, balance });
  } catch (e: any) {
    console.error('Get balance error:', e);
    return NextResponse.json(
      { success: false, error: e.message || 'Failed to get balance' },
      { status: 500 }
    );
  }
}
