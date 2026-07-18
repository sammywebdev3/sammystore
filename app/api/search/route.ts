import { NextResponse } from 'next/server';
import { getAllListings } from '@/lib/accszone';
import { getAllProducts as getHstoraProducts } from '@/lib/hstora';
import { japRequest } from '@/lib/jap';
import { getMarkups, computeMarkup, toNgn } from '@/lib/pricing';

const MAX_RESULTS_PER_TYPE = 15;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  if (!q) {
    return NextResponse.json({ success: true, results: [] });
  }

  const markups = await getMarkups();
  const results: Array<{
    type: 'account' | 'smm';
    id: string;
    name: string;
    category?: string;
    price: number;
    href: string;
  }> = [];

  try {
    const listings = await getAllListings();

    for (const listing of listings) {
      const name = listing.title || '';
      const category = listing.subcategory?.title || listing.category?.title || '';
      if (name.toLowerCase().includes(q) || category.toLowerCase().includes(q)) {
        const baseUnitPriceUsd = parseFloat(String(listing.price));
        results.push({
          type: 'account',
          id: `buyacc1_${listing.id}`,
          name,
          category,
          price: isNaN(baseUnitPriceUsd) ? 0 : computeMarkup(toNgn(baseUnitPriceUsd), markups.accounts),
          href: `/accounts/buyacc1_${listing.id}`,
        });
        if (results.filter((r) => r.type === 'account').length >= MAX_RESULTS_PER_TYPE) break;
      }
    }
  } catch {
    // Provider unavailable — skip this source, don't fail the whole search
  }

  try {
    const hstoraProducts = await getHstoraProducts();

    for (const p of hstoraProducts) {
      const name = p.name || '';
      if (name.toLowerCase().includes(q)) {
        // Trust HStora's own `currency` field rather than assuming USD -
        // see the matching fix in /api/logs/products.
        const baseUnitPriceNgn =
          p.currency && String(p.currency).toUpperCase() !== 'USD' ? (p.price || 0) : toNgn(p.price || 0);
        results.push({
          type: 'account',
          id: `buyacc2_${p.id}`,
          name,
          category: undefined,
          price: computeMarkup(baseUnitPriceNgn, markups.accounts),
          href: `/logs/buyacc2_${p.id}`,
        });
        if (results.filter((r) => r.type === 'account').length >= MAX_RESULTS_PER_TYPE) break;
      }
    }
  } catch {
    // Provider unavailable — skip this source, don't fail the whole search
  }

  try {
    const smmData = await japRequest('services');
    const services = Array.isArray(smmData) ? smmData : [];

    for (const s of services) {
      const name = s.name || '';
      const category = s.category || '';
      if (name.toLowerCase().includes(q) || category.toLowerCase().includes(q)) {
        const rate = computeMarkup(toNgn(parseFloat(s.rate) || 0), markups.smm);
        results.push({
          type: 'smm',
          id: String(s.service),
          name,
          category,
          price: rate,
          href: `/smm?service=${s.service}`,
        });
        if (results.filter((r) => r.type === 'smm').length >= MAX_RESULTS_PER_TYPE) break;
      }
    }
  } catch {
    // Provider unavailable — skip this source, don't fail the whole search
  }

  return NextResponse.json({ success: true, results });
}
