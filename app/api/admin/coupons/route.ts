import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Coupon from '@/models/Coupon';
import { verifyAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
  await dbConnect();
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const coupons = await Coupon.find().sort({ createdAt: -1 });
  return NextResponse.json({ success: true, coupons });
}

export async function POST(request: Request) {
  await dbConnect();
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { code, type, value, maxDiscount, usageLimit, perUserLimit, expiresAt } = body;

  if (!code || !type || !['percent', 'fixed'].includes(type) || !value || value <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid coupon fields' }, { status: 400 });
  }
  if (type === 'percent' && value > 100) {
    return NextResponse.json({ success: false, error: 'Percent value cannot exceed 100' }, { status: 400 });
  }

  try {
    const coupon = await Coupon.create({
      code: String(code).trim().toUpperCase(),
      type,
      value,
      maxDiscount: maxDiscount || null,
      usageLimit: usageLimit || null,
      perUserLimit: perUserLimit ?? 1,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
    return NextResponse.json({ success: true, coupon });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: 'A coupon with this code already exists' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to create coupon' }, { status: 500 });
  }
}
