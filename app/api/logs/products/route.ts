import { NextResponse } from 'next/server';
import { getMarkups, computeMarkup, toNgn } from '@/lib/pricing';
import { getAllProducts as getHstoraProducts } from '@/lib/hstora';

// buyacc2 (HStora) lives on its own page/API now, separate from buyacc1
// (AccsZone) on /accounts - same split as Virtual Numbers, SMM, and My
// Catalog each having their own page, instead of merging two different
// providers behind one "Buy Accounts" listing.
export async function GET() {
  const markups = await getMarkups();

  if (!process.env.HSTORA_API_KEY || !process.env.HSTORA_API_SECRET) {
    return NextResponse.json(
      { success: false, error: 'HStora API key not configured', products: [] },
      { status: 500 }
    );
  }

  try {
    const listings = await getHstoraProducts();
    const products = listings.map((listing) => ({
      id: `buyacc2_${listing.id}`,
      name: listing.name,
      category: 'Other',
      mainCategory: 'Other',
      // Trust HStora's own `currency` field rather than assuming USD - a
      // hardcoded USD assumption is exactly what caused the BenOTP numbers
      // pricing bug (overcharging ~1550x when that provider's prices
      // turned out to already be NGN).
      price: computeMarkup(
        listing.currency && listing.currency.toUpperCase() !== 'USD'
          ? (listing.price || 0)
          : toNgn(listing.price || 0),
        markups.accounts
      ),
      stock: typeof listing.stock_available === 'number' ? listing.stock_available : null,
      instructions: listing.short_description || null,
      video: null,
      source: 'buyacc2',
    }));

    return NextResponse.json({ success: true, products, count: products.length });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'HStora network error', products: [] },
      { status: 500 }
    );
  }
}
