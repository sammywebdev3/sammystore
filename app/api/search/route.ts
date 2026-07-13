import { NextResponse } from 'next/server';
import { buyAccountsRequest } from '@/lib/buyaccounts';
import { japRequest } from '@/lib/jap';
import { getMarkups, computeMarkup, toNgn } from '@/lib/pricing';

function extractProducts(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.categories)) {
      return data.categories.flatMap((c: any) =>
        Array.isArray(c.products) ? c.products.map((p: any) => ({ ...p, category: c.name })) : []
      );
    }
    if (Array.isArray(data.products)) return data.products;
    if (data.product && typeof data.product === 'object') return [data.product];
  }
  return [];
}

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
    const productData = await buyAccountsRequest('getProducts');
    const products = extractProducts(productData);

    for (const p of products) {
      const name = p.name || p.title || '';
      const category = p.category || '';
      if (name.toLowerCase().includes(q) || category.toLowerCase().includes(q)) {
        const baseUnitPrice = parseFloat(String(p.price));
        results.push({
          type: 'account',
          id: String(p.id),
          name,
          category,
          price: isNaN(baseUnitPrice) ? 0 : computeMarkup(baseUnitPrice, markups.accounts),
          href: `/accounts/${p.id}`,
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
