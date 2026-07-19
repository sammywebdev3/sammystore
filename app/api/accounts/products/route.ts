import { NextResponse } from 'next/server';
import { getMarkups, computeMarkup, toNgn } from '@/lib/pricing';
import { getAllProducts as getBenotpProducts } from '@/lib/benotp-accounts';

export async function GET() {
  const markups = await getMarkups();

  if (!process.env.BENOTP_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'BenOTP API key not configured', products: [] },
      { status: 500 }
    );
  }

  try {
    const listings = await getBenotpProducts();
    const products = listings.map((listing) => ({
      id: `buyacc1_${listing.id}`,
      name: listing.name,
      category: listing.categoryName || 'Other',
      mainCategory: listing.categoryName || 'Other',
      price: computeMarkup(toNgn(parseFloat(String(listing.price)) || 0), markups.accounts),
      // BenOTP's `amount` field on each product IS the stock count.
      stock: listing.amount !== undefined && listing.amount !== null ? parseInt(String(listing.amount), 10) : null,
      instructions: listing.description || null,
      video: null,
      source: 'buyacc1',
    }));

    return NextResponse.json({ success: true, products, count: products.length });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'BenOTP network error', products: [] },
      { status: 500 }
    );
  }
}
