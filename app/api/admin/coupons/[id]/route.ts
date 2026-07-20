import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Coupon from '@/models/Coupon';
import { verifyAdmin } from '@/lib/adminAuth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { active } = await request.json();

  const coupon = await Coupon.findByIdAndUpdate(id, { active }, { new: true });
  if (!coupon) return NextResponse.json({ success: false, error: 'Coupon not found' }, { status: 404 });

  return NextResponse.json({ success: true, coupon });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) return NextResponse.json({ success: false, error: 'Coupon not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
