import { NextResponse } from 'next/server';
import { getAll1Services, getAll2Services } from '@/lib/benotp';

export const dynamic = 'force-dynamic';

// all1/all2's getServices is a flat, unpriced ID->name directory shared
// across the whole platform (not a priced catalog like usa1/usa2's
// getServices) - this just lets the frontend show real service names in a
// picker instead of forcing the customer to type a raw numeric code. The
// actual price for whichever service they pick still comes from
// /api/numbers/benotp/price (all1) or its all2 equivalent.
export async function GET(req: Request) {
  const pool = new URL(req.url).searchParams.get('pool');
  const country = new URL(req.url).searchParams.get('country') || undefined;

  if (pool !== 'all1' && pool !== 'all2') {
    return NextResponse.json({ success: false, error: 'pool must be all1 or all2' }, { status: 400 });
  }

  try {
    const services = pool === 'all1' ? await getAll1Services() : await getAll2Services(country);
    const sorted = [...services].sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ success: true, pool, services: sorted });
  } catch (e: any) {
    console.error(`BenOTP getServices directory (${pool}) error:`, e);
    return NextResponse.json(
      { success: false, error: e.message || 'Failed to load service list' },
      { status: 500 }
    );
  }
}
