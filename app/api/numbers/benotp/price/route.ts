import { NextResponse } from 'next/server';
import { getAll1Price, getAll2Price } from '@/lib/benotp';
import { getMarkups, computeMarkup } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

// Both all1 (getPrice) and all2 (getPrices) are single service+country
// checks, not browsable lists - this is a "check price" lookup the
// customer triggers after picking a service (from the service-directory
// route) and typing a country, not a bulk catalog fetch.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pool = searchParams.get('pool') || 'all1';
  const service = searchParams.get('service');
  const country = searchParams.get('country');
  const areaCode = searchParams.get('areaCode') || undefined;

  if (pool !== 'all1' && pool !== 'all2') {
    return NextResponse.json({ success: false, error: 'pool must be all1 or all2' }, { status: 400 });
  }
  if (!service || !country) {
    return NextResponse.json(
      { success: false, error: 'service and country are required' },
      { status: 400 }
    );
  }

  try {
    const [quote, markups] = await Promise.all([
      pool === 'all1' ? getAll1Price(service, country, areaCode) : getAll2Price(service, country, areaCode),
      getMarkups(),
    ]);

    return NextResponse.json({
      success: true,
      service: quote.service,
      count: quote.count,
      // BenOTP's getPrice/getPrices already returns NGN, not USD - see the
      // note in /api/numbers/benotp/services for why toNgn() must not
      // wrap this.
      priceNgn: computeMarkup(quote.price, markups.numbers),
    });
  } catch (e: any) {
    console.error(`BenOTP getPrice (${pool}) error:`, e);
    return NextResponse.json(
      { success: false, error: e.message || 'Failed to get price' },
      { status: 500 }
    );
  }
}
