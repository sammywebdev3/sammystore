import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import Announcement from '@/models/Announcement';

// Toggle an announcement's active state (e.g. deactivate once the issue
// is resolved, or reactivate an old one) without losing its history.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { active } = await request.json();

  await dbConnect();
  const announcement = await Announcement.findById(id);
  if (!announcement) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });

  announcement.active = !!active;
  await announcement.save();

  return NextResponse.json({ success: true, announcement });
}

// Permanently remove an announcement from the history list.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  await dbConnect();
  const announcement = await Announcement.findByIdAndDelete(id);
  if (!announcement) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
