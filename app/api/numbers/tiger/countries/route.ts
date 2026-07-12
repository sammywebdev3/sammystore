import { NextResponse } from 'next/server';
import { getCountries } from '@/lib/tigerSms';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const countries = await getCountries();
    return NextResponse.json({ success: true, countries });
  } catch (e: any) {
    console.error('Get countries error:', e);
    return NextResponse.json(
      { success: false, error: e.message || 'Failed to load countries' },
      { status: 500 }
    );
  }
}
