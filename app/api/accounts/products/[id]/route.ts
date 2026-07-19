import { NextResponse } from 'next/server';
import { getMarkups, computeMarkup, toNgn } from '@/lib/pricing';
import { getProduct } from '@/lib/benotp-accounts';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const markups = await getMarkups();

  if (!process.env.BENOTP_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'BenOTP API key not configured' },
      { status: 500 }
    );
  }

  const { id } = await params;
  const rawId = id.replace(/^buyacc1_/, '');

  try {
    const listing = await getProduct(rawId);
    if (!listing) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    const product = {
      id: `buyacc1_${listing.id}`,
      name: listing.name,
      category: listing.categoryName || 'Other',
      mainCategory: listing.categoryName || 'Other',
      price: computeMarkup(toNgn(parseFloat(String(listing.price)) || 0), markups.accounts),
      stock: listing.amount !== undefined && listing.amount !== null ? parseInt(String(listing.amount), 10) : null,
      instructions: listing.description || null,
      video: null,
      source: 'buyacc1',
    };

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'BenOTP network error' },
      { status: 500 }
    );
  }
}
