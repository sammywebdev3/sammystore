import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongodb';
import PricingSettings from '@/models/PricingSettings';
import { getMarkups, invalidateMarkupCache, MarkupCategory } from '@/lib/pricing';

export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const markups = await getMarkups();
  return NextResponse.json({ success: true, markups });
}

const CATEGORIES: MarkupCategory[] = ['numbers', 'smm', 'accounts'];

export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await dbConnect();
  const body = await request.json();

  const update: Record<string, number> = {};
  for (const category of CATEGORIES) {
    if (body[category] === undefined || body[category] === null) continue;
    const value = parseFloat(String(body[category]));
    if (isNaN(value) || value < -99 || value > 1000) {
      return NextResponse.json(
        { error: `Invalid markup for ${category}: must be a number between -99 and 1000` },
        { status: 400 }
      );
    }
    update[`markups.${category}`] = value;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid markup values provided' }, { status: 400 });
  }

  const doc = await PricingSettings.findOneAndUpdate(
    { key: 'pricing' },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  invalidateMarkupCache();

  return NextResponse.json({ success: true, markups: doc.markups });
}
