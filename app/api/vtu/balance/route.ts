import { NextResponse } from 'next/server';
import { clubkonnectRequest } from '@/lib/clubkonnect';

export async function GET() {
  try {
    const data = await clubkonnectRequest('/balance');
    return NextResponse.json({ success: true, balance: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
