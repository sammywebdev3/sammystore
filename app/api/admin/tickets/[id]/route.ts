import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import { verifyAdmin } from '@/lib/adminAuth';

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

  const ticket = await Ticket.findById(id);
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
  return NextResponse.json({ success: true, ticket });
}
