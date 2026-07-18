import axios from 'axios';
import crypto from 'crypto';

const BASE_URL = 'https://hstora.com/api/v1';
const PATH_PREFIX = '/api/v1';

function getCredentials() {
  const apiKey = process.env.HSTORA_API_KEY;
  const apiSecret = process.env.HSTORA_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error('HStora API key not configured');
  return { apiKey, apiSecret };
}

// HStora signs every request over a canonical string built from the method,
// exact path (including /api/v1), raw query string, timestamp, nonce, and a
// hash of the JSON body (empty for GET). See https://hstora.com/api-doc.
function sign(
  apiSecret: string,
  method: string,
  path: string,
  query: string,
  timestamp: string,
  nonce: string,
  bodyHash: string
) {
  const canonical = [method, path, query, timestamp, nonce, bodyHash].join('\n');
  return crypto.createHmac('sha256', apiSecret).update(canonical).digest('hex');
}

async function hstoraRequest(
  method: 'GET' | 'POST',
  routePath: string,
  params?: Record<string, any>,
  body?: Record<string, any>,
  extraHeaders?: Record<string, string>
) {
  const { apiKey, apiSecret } = getCredentials();

  const path = PATH_PREFIX + routePath;
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) searchParams.set(k, String(v));
    });
  }
  // Raw query string in the same order we send it, no leading '?' - required
  // by the canonical string rules.
  const query = searchParams.toString();

  const rawBody = body ? JSON.stringify(body) : '';
  const bodyHash = rawBody ? crypto.createHash('sha256').update(rawBody).digest('hex') : '';

  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(16).toString('hex');
  const signature = sign(apiSecret, method, path, query, timestamp, nonce, bodyHash);

  const url = query ? `${BASE_URL}${routePath}?${query}` : `${BASE_URL}${routePath}`;

  const response = await axios({
    method,
    url,
    headers: {
      'X-API-Key': apiKey,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    data: rawBody || undefined,
    timeout: 10000,
    validateStatus: () => true,
  });

  if (response.status >= 400 || response.data?.success === false) {
    throw new Error(response.data?.error?.message || `HStora API error (HTTP ${response.status})`);
  }

  return response.data;
}

export interface HstoraProduct {
  id: number;
  name: string;
  slug: string;
  short_description?: string;
  price: number;
  currency: string;
  delivery_type: string;
  stock_available: number;
  product_url?: string;
  updated_at?: string;
  description?: string | null;
  price_tiers?: { min_quantity: number; unit_price: number }[];
}

// Walks every page of /catalog to return the full active product list in
// one call, same shape as getAllListings() in lib/accszone.ts.
export async function getAllProducts(): Promise<HstoraProduct[]> {
  const all: HstoraProduct[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const data = await hstoraRequest('GET', '/catalog', { page, limit });
    if (!data?.success || !Array.isArray(data.data?.items)) break;
    all.push(...data.data.items);

    const pagination = data.data.pagination;
    if (!pagination || page >= pagination.pages) break;
    page++;
  }

  return all;
}

export async function getProduct(id: number | string): Promise<HstoraProduct> {
  const data = await hstoraRequest('GET', `/products/${id}`);
  return data.data;
}

export interface HstoraOrderResult {
  id: number;
  order_number: string;
  external_order_id: string;
  status: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  delivery_type: string;
  delivery: { available: boolean; items: string[] };
  links: { web_url: string; api_url: string };
}

// external_order_id and Idempotency-Key are both required by HStore on every
// POST /orders - reusing the same idempotency key with the same payload
// safely returns the same order instead of double-charging on a retry.
export async function createOrder(
  productId: number | string,
  quantity: number,
  externalOrderId: string
): Promise<HstoraOrderResult> {
  const data = await hstoraRequest(
    'POST',
    '/orders',
    undefined,
    { product_id: Number(productId), quantity, external_order_id: externalOrderId },
    { 'Idempotency-Key': `idem-${externalOrderId}` }
  );
  return data.data;
}

export async function getOrderByExternalId(externalOrderId: string): Promise<HstoraOrderResult> {
  const data = await hstoraRequest('GET', '/orders/lookup', { external_order_id: externalOrderId });
  return data.data;
}
