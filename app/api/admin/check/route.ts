import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ success: true, isAdmin: true });
}
