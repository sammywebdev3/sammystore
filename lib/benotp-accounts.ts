import axios from 'axios';

const BASE_URL = 'https://benotp.com/stubs/buy-accounts.php';

async function benotpRequest(params: Record<string, any>) {
  const apiKey = process.env.BENOTP_API_KEY;
  if (!apiKey) throw new Error('BenOTP API key not configured');

  const response = await axios.get(BASE_URL, {
    params: { ...params, api_key: apiKey },
    timeout: 10000,
    validateStatus: () => true,
  });

  const data = response.data;
  // Confirmed error envelope: { status: 'error', error: <numeric code>,
  // msg: '<TEXT>' } - e.g. INSUFFICIENT_BALANCE. `error` is a numeric code,
  // not a message, so `msg` must be checked first.
  if (response.status >= 400 || data?.status === 'error' || data?.success === false) {
    throw new Error(data?.msg || data?.message || `BenOTP API error (HTTP ${response.status})`);
  }

  return data;
}

// Confirmed live response shape (2026-07-19):
// { success: true, categories: [ { id, name, products: [ { id, name, price,
// amount, description, min, max, source? } ] } ] }
// `amount` on each product is STOCK COUNT, not price - don't confuse with
// buyProduct's `amount` query param, which is purchase quantity.
// Some products are tagged source:"local" (BenOTP's own hosted catalog -
// proxies/VPNs/emails); untagged ones are resold inventory (e.g. the FB
// account categories match AccsZone's catalog 1:1). Both are handled the
// same way here since they come through the same endpoint/response.
export interface BenotpProduct {
  id: string;
  name: string;
  price: number;
  amount: number; // stock count
  description: string;
  min: string;
  max: string;
  source?: string;
  categoryName: string;
}

interface BenotpCategory {
  id: string;
  name: string;
  products: Omit<BenotpProduct, 'categoryName'>[];
}

export async function getAllProducts(): Promise<BenotpProduct[]> {
  const data = await benotpRequest({ action: 'getProducts' });
  const categories: BenotpCategory[] = Array.isArray(data?.categories) ? data.categories : [];

  const flat: BenotpProduct[] = [];
  for (const cat of categories) {
    if (!Array.isArray(cat.products)) continue;
    for (const p of cat.products) {
      flat.push({ ...p, categoryName: cat.name });
    }
  }
  return flat;
}

export async function getProduct(id: number | string): Promise<BenotpProduct | null> {
  // No documented single-item endpoint - filtering the full flattened list
  // until/unless BenOTP confirms a dedicated route.
  const all = await getAllProducts();
  return all.find((p) => String(p.id) === String(id)) || null;
}

export interface BenotpPurchaseResult {
  status?: string;
  success?: boolean;
  order_id?: string | number;
  data?: any;
  [key: string]: any;
}

// buyProduct's own `amount` param is purchase quantity, unrelated to the
// stock-count `amount` field returned by getProducts above.
export async function purchaseProduct(
  id: number | string,
  quantity: number,
  coupon?: string
): Promise<BenotpPurchaseResult> {
  const params: Record<string, any> = { action: 'buyProduct', id, amount: quantity };
  if (coupon) params.coupon = coupon;
  return benotpRequest(params);
}
