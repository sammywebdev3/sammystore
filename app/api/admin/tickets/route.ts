import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// List every ticket across all users, most recently updated first, with
// the owning user's name/email populated for the admin list view.
export async function GET(request: Request) {
  await dbConnect();
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tickets = await Ticket.find({})
    .sort({ updatedAt: -1 })
    .populate('userId', 'name email')
    .lean();
  return NextResponse.json({ success: true, tickets });
}
