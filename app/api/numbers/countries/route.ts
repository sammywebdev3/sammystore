import { NextResponse } from 'next/server';
import { fiveSimRequest } from '@/lib/5sim';

export async function GET() {
  try {
    const data = await fiveSimRequest('/countries');
    return NextResponse.json({ success: true, countries: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
