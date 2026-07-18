import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import { getUserId } from '@/lib/auth';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// View a single ticket - only the owning user can see it.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await Ticket.findOne({ _id: id, userId });
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }
    if (ticket.userUnread) {
      ticket.userUnread = false;
      await ticket.save();
    }
  return NextResponse.json({ success: true, ticket });
}

// User replies to their own ticket. Re-opening semantics: a user reply on
// a closed ticket reopens it as "pending" (needs admin attention again),
// same pattern as most helpdesk tools.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { message } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const ticket = await Ticket.findOne({ _id: id, userId });
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  ticket.messages.push({ sender: 'user', message: message.trim(), createdAt: new Date() });
  ticket.status = 'pending';
  await ticket.save();

  return NextResponse.json({ success: true, ticket });
}
