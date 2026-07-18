import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import { getUserId } from '@/lib/auth';

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

  const { subject, message } = await request.json();
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
  }

  try {
    const ticket = await Ticket.create({
      userId,
      subject: subject.trim(),
      status: 'pending',
      messages: [{ sender: 'user', message: message.trim() }],
    });
    return NextResponse.json({ success: true, ticket });
  } catch (e: any) {
    console.error('Create ticket error:', e);
    return NextResponse.json({ error: e.message || 'Failed to create ticket' }, { status: 500 });
  }
}
