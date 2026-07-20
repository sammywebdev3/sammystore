import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import { verifyAdmin } from '@/lib/adminAuth';
import { sendTicketReplyEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// View a single ticket as admin, with the owning user populated.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await Ticket.findById(id).populate('userId', 'name email');
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }
    if (ticket.adminUnread) {
      ticket.adminUnread = false;
      await ticket.save();
    }
  return NextResponse.json({ success: true, ticket });
}

// Admin reply - also accepts an optional status override (e.g. closing
// the ticket in the same action as the final reply) so the admin UI can
// do both in one request instead of two.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { message, status } = await request.json();

  const ticket = await Ticket.findById(id).populate('userId', 'name email');
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  if (message?.trim()) {
    ticket.messages.push({ sender: 'admin', message: message.trim(), createdAt: new Date() });
      ticket.userUnread = true;
  }

  if (status && ['open', 'pending', 'closed'].includes(status)) {
    ticket.status = status;
  } else if (message?.trim()) {
    // A reply with no explicit status defaults to "open" (awaiting the
    // customer), mirroring the user-reply route's inverse default.
    ticket.status = 'open';
  }

  await ticket.save();

  // Fire-and-forget: don't let a slow/failed email delay or break the
  // reply response - the ticket update above already succeeded. Only
  // notify when an actual reply was added, not on a status-only change.
  if (message?.trim() && ticket.userId?.email) {
    sendTicketReplyEmail({
      to: ticket.userId.email,
      subject: ticket.subject,
      message: message.trim(),
    }).catch((err) => console.error('Ticket reply email failed:', err));
  }

  return NextResponse.json({ success: true, ticket });
}
