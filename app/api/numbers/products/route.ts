import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/fiveSimAdapter';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  if (!country) return NextResponse.json({ success: false, error: 'Country required' }, { status: 400 });
  return getProducts(country);
}
