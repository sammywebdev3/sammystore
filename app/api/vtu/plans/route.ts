import { NextResponse } from 'next/server';
import { clubkonnectRequest } from '@/lib/clubkonnect';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'data';
  const network = searchParams.get('network');

  try {
    const params: any = { type };
    if (network) params.network = network;
    
    const data = await clubkonnectRequest('/plans', params);
    return NextResponse.json({ success: true, plans: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
