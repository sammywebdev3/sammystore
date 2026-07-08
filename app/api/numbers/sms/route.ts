import { NextResponse } from 'next/server';
import { fiveSimRequest } from '@/lib/5sim';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');

  try {
    const data = await fiveSimRequest(`/check/${orderId}`);
    return NextResponse.json({ success: true, sms: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
