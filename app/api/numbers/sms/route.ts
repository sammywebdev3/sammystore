import { NextResponse } from 'next/server';
import { checkSms } from '@/lib/fiveSimAdapter';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  if (!orderId) return NextResponse.json({ success: false, error: 'Order ID required' }, { status: 400 });
  return checkSms(orderId);
}
