import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import { getUserId } from '@/lib/auth';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// List the logged-in user's own tickets, most recently updated first.
export async function GET(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tickets = await Ticket.find({ userId }).sort({ updatedAt: -1 }).lean();
  return NextResponse.json({ success: true, tickets });
}

// Create a new ticket - starts as "pending" (awaiting admin reply) with
// the user's first message already in the thread.
export async function POST(request: Request) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subject, message, attachmentUrl } = await request.json();
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
  }

  // Attachments are optional screenshots (e.g. payment proof), sent as a
  // base64 data URI. Validate type/size server-side too, since the client
  // check can be bypassed.
  let cleanAttachment: string | undefined;
  if (attachmentUrl) {
    const isImageDataUri = /^data:image\/(png|jpe?g|webp|gif);base64,/.test(attachmentUrl);
    const approxBytes = (attachmentUrl.length * 3) / 4;
    if (!isImageDataUri) {
      return NextResponse.json({ error: 'Attachment must be an image' }, { status: 400 });
    }
    if (approxBytes > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Attachment must be under 5MB' }, { status: 400 });
    }
    cleanAttachment = attachmentUrl;
  }

  try {
    const ticket = await Ticket.create({
      userId,
      subject: subject.trim(),
      status: 'pending',
      messages: [{ sender: 'user', message: message.trim(), attachmentUrl: cleanAttachment }],
    });

    sendTelegramMessage(
      `🆕 <b>New support ticket</b>\n<b>Subject:</b> ${subject.trim()}\n<b>Message:</b> ${message.trim().slice(0, 300)}${cleanAttachment ? '\n📎 Screenshot attached (view in admin panel)' : ''}`
    );

    return NextResponse.json({ success: true, ticket });
  } catch (e: any) {
    console.error('Create ticket error:', e);
    return NextResponse.json({ error: e.message || 'Failed to create ticket' }, { status: 500 });
  }
}
