import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Announcement from '@/models/Announcement';

export const dynamic = 'force-dynamic';

// Public, unauthenticated - the whole point is every visitor (logged in
// or not) can see active site-wide notices, so no auth check here.
export async function GET() {
  await dbConnect();
  const announcements = await Announcement.find({ active: true })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('message severity createdAt')
    .lean();

  return NextResponse.json({ success: true, announcements });
}
