import { NextResponse } from 'next/server';
import { japRequest } from '@/lib/jap';

export async function GET() {
  try {
    const data = await japRequest('services');
    return NextResponse.json({ success: true, services: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
