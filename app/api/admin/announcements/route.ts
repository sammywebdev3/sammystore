import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import Announcement from '@/models/Announcement';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// List all announcements (active + past), most recent first, for the
// admin panel history view.
export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await dbConnect();
  const announcements = await Announcement.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ success: true, announcements });
}

// Broadcast a new site-wide message. Shows up for every visitor via the
// public /api/announcements endpoint until the admin deactivates it.
export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await dbConnect();
  const { message, severity } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const validSeverity = ['info', 'warning', 'critical'].includes(severity) ? severity : 'info';

  const announcement = await Announcement.create({
    message: message.trim(),
    severity: validSeverity,
    active: true,
    createdBy: admin._id,
  });

  sendTelegramMessage(
    `📢 <b>Site-wide announcement sent</b>\n<b>Severity:</b> ${validSeverity}\n<b>Message:</b> ${message.trim().slice(0, 300)}`
  );

  return NextResponse.json({ success: true, announcement });
}
