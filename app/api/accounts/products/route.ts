import { NextResponse } from 'next/server';
import { getMarkups, computeMarkup, toNgn } from '@/lib/pricing';
import { getAllListings as getAccszoneListings } from '@/lib/accszone';

// buyacc1 (AccsZone) only - buyacc2 (HStora) has its own page/API now at
// /logs, same split as Virtual Numbers, SMM, and My Catalog each having
// their own page rather than two providers merged behind one listing.
export async function GET() {
  const markups = await getMarkups();

  if (!process.env.ACCSZONE_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'AccsZone API key not configured', products: [] },
      { status: 500 }
    );
  }

  try {
    const listings = await getAccszoneListings();
    const products = listings.map((listing: any) => ({
      id: `buyacc1_${listing.id}`,
      name: listing.title,
      category: listing.subcategory?.title || listing.category?.title || 'Other',
      mainCategory: listing.category?.title || 'Other',
      // AccsZone prices in USD - convert to NGN before applying markup,
      // same conversion already used for the TigerSMS numbers feature.
      price: computeMarkup(toNgn(parseFloat(listing.price) || 0), markups.accounts),
      stock: typeof listing.available_stock === 'number' ? listing.available_stock : null,
      instructions: listing.description || null,
      video: null,
      source: 'buyacc1',
    }));

    return NextResponse.json({ success: true, products, count: products.length });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'AccsZone network error', products: [] },
      { status: 500 }
    );
  }
}
