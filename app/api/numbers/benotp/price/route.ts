import { NextResponse } from 'next/server';
import { getAll1Price } from '@/lib/benotp';
import { toNgn, getMarkups, computeMarkup } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

// all1 has no bulk catalog action - getPrice only answers for one exact
// service+country pair at a time, so this is a "check price" lookup the
// customer triggers after entering both fields, not a browsable list.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const service = searchParams.get('service');
  const country = searchParams.get('country');
  const areaCode = searchParams.get('areaCode') || undefined;

  if (!service || !country) {
    return NextResponse.json(
      { success: false, error: 'service and country are required' },
      { status: 400 }
    );
  }

  try {
    const [quote, markups] = await Promise.all([
      getAll1Price(service, country, areaCode),
      getMarkups(),
    ]);

    return NextResponse.json({
      success: true,
      service: quote.service,
      count: quote.count,
      priceNgn: computeMarkup(toNgn(quote.price), markups.numbers),
    });
  } catch (e: any) {
    console.error('BenOTP getAll1Price error:', e);
    return NextResponse.json(
      { success: false, error: e.message || 'Failed to get price' },
      { status: 500 }
    );
  }
}
