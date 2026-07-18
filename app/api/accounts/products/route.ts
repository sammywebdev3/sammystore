import { NextResponse } from 'next/server';
import { getMarkups, computeMarkup, toNgn } from '@/lib/pricing';
import { getAllListings as getAccszoneListings } from '@/lib/accszone';

async function fetchAccszoneProducts(markupPercent: number): Promise<{ products: any[]; error: string | null }> {
  if (!process.env.ACCSZONE_API_KEY) {
    return { products: [], error: 'AccsZone API key not configured' };
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
      price: computeMarkup(toNgn(parseFloat(listing.price) || 0), markupPercent),
      stock: typeof listing.available_stock === 'number' ? listing.available_stock : null,
      instructions: listing.description || null,
      video: null,
      source: 'buyacc1',
    }));
    return { products, error: null };
  } catch (error: any) {
    return { products: [], error: error.message || 'AccsZone network error' };
  }
}

export async function GET() {
  const markups = await getMarkups();

  const { products, error } = await fetchAccszoneProducts(markups.accounts);

  if (products.length === 0 && error) {
    return NextResponse.json(
      { success: false, error, products: [] },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    products,
    count: products.length,
    sourceErrors: { buyacc1: error },
  });
}
