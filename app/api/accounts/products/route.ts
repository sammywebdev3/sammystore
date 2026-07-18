import { NextResponse } from 'next/server';
import { getMarkups, computeMarkup, toNgn } from '@/lib/pricing';
import { getAllListings as getAccszoneListings } from '@/lib/accszone';
import { getAllProducts as getHstoraProducts } from '@/lib/hstora';

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

async function fetchHstoraProducts(markupPercent: number): Promise<{ products: any[]; error: string | null }> {
  if (!process.env.HSTORA_API_KEY || !process.env.HSTORA_API_SECRET) {
    return { products: [], error: 'HStora API key not configured' };
  }

  try {
    const listings = await getHstoraProducts();
    const products = listings.map((listing) => ({
      id: `buyacc2_${listing.id}`,
      name: listing.name,
      category: 'Other',
      mainCategory: 'Other',
      // HStora prices in USD - same NGN conversion used for buyacc1/numbers.
      price: computeMarkup(toNgn(listing.price || 0), markupPercent),
      stock: typeof listing.stock_available === 'number' ? listing.stock_available : null,
      instructions: listing.short_description || null,
      video: null,
      source: 'buyacc2',
    }));
    return { products, error: null };
  } catch (error: any) {
    return { products: [], error: error.message || 'HStora network error' };
  }
}

export async function GET() {
  const markups = await getMarkups();

  const [accszone, hstora] = await Promise.all([
    fetchAccszoneProducts(markups.accounts),
    fetchHstoraProducts(markups.accounts),
  ]);

  const products = [...accszone.products, ...hstora.products];

  if (products.length === 0 && (accszone.error || hstora.error)) {
    return NextResponse.json(
      { success: false, error: accszone.error || hstora.error, products: [] },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    products,
    count: products.length,
    sourceErrors: { buyacc1: accszone.error, buyacc2: hstora.error },
  });
}
