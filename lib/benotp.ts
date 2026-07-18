import axios from 'axios';

const API_KEY = process.env.BENOTP_API_KEY;

// BenOTP resells numbers through four distinct pools, each its own endpoint
// with a slightly different parameter/response shape. "USA" pools are
// US-only and support carrier/area-code targeting; "All Countries" pools
// cover everywhere else (BenOTP advertises 70+ countries) and support
// pool/operator targeting instead. Scope here is numbers only, per request -
// this file does not touch BenOTP's Buy Accounts, SMM, or VTU APIs.
export type BenotpPool = 'usa1' | 'usa2' | 'all1' | 'all2';

const POOL_CONFIG: Record<BenotpPool, { baseUrl: string; label: string }> = {
  usa1: { baseUrl: 'https://benotp.com/stubs/handler_api.php', label: 'USA Server 1' },
  usa2: { baseUrl: 'https://benotp.com/stubs/sms.php', label: 'USA Server 2' },
  all1: { baseUrl: 'https://benotp.com/stubs/handler.php', label: 'All Countries 1' },
  all2: { baseUrl: 'https://benotp.com/stubs/all_server_2.php', label: 'All Countries 2' },
};

export function poolLabel(pool: BenotpPool) {
  return POOL_CONFIG[pool].label;
}

async function benotpRequest(pool: BenotpPool, params: Record<string, any>) {
  if (!API_KEY) {
    throw new Error('BENOTP_API_KEY environment variable is not set');
  }
  const { baseUrl } = POOL_CONFIG[pool];

  const query: Record<string, any> = { api_key: API_KEY, ...params };
  Object.keys(query).forEach((k) => {
    if (query[k] === undefined || query[k] === null || query[k] === '') delete query[k];
  });

  const res = await axios.get(baseUrl, { params: query, timeout: 20000 });
  console.log(`[BenOTP:${pool}] ${params.action} response:`, res.data);
  return res.data;
}

// All four pools respond to getNumber with the same classic SMS-Activate
// convention: a bare colon-delimited string, "ACCESS_NUMBER:<id>:<number>"
// on success, or a bare error code string like NO_NUMBERS / NO_BALANCE on
// failure. Confirmed from the same handler_api.php/sms.php/handler.php
// family already proven out with TigerSMS - kept as a starting parse, but
// unlike the TigerSMS cancel bug, log the raw response either way so a
// wrong assumption surfaces immediately in Vercel logs instead of silently
// misreporting success/failure.
function parseGetNumberResponse(pool: BenotpPool, data: any) {
  if (typeof data === 'string') {
    const parts = data.split(':');
    if (parts[0] === 'ACCESS_NUMBER' && parts.length >= 3) {
      return { activationId: parts[1], phoneNumber: parts[2] };
    }
    throw new Error(`BenOTP (${poolLabel(pool)}) could not provide a number: ${data}`);
  }
  // Some pools may respond with JSON instead - handle defensively rather
  // than assuming the bare-string shape universally.
  if (data && typeof data === 'object') {
    const id = data.id || data.activation_id || data.order_id;
    const number = data.number || data.phone || data.phone_number;
    if (id && number) return { activationId: String(id), phoneNumber: String(number) };
    throw new Error(`BenOTP (${poolLabel(pool)}) could not provide a number: ${JSON.stringify(data)}`);
  }
  throw new Error(`BenOTP (${poolLabel(pool)}) returned an unrecognized response: ${JSON.stringify(data)}`);
}

export async function getNumber(
  pool: BenotpPool,
  opts: { service: string; country?: string; areaCode?: string; carrier?: string; quantity?: string }
) {
  const { service, country, areaCode, carrier, quantity } = opts;

  let params: Record<string, any>;
  switch (pool) {
    case 'usa1':
      params = { action: 'getNumber', service, country: 'usa', carrier, area_codes: areaCode };
      break;
    case 'usa2':
      params = { action: 'getNumber', service, country: 'usa', carrier, area_codes: areaCode };
      break;
    case 'all1':
      params = { action: 'getNumber', service, country, areacode: areaCode, quantity };
      break;
    case 'all2':
      params = { action: 'getNumber', service, country };
      break;
  }

  const data = await benotpRequest(pool, params);
  return parseGetNumberResponse(pool, data);
}

// getStatus response is the same family of bare strings as TigerSMS/
// SMS-Activate: STATUS_WAIT_CODE, STATUS_OK:<code>, STATUS_CANCEL, etc.
export async function checkStatus(pool: BenotpPool, activationId: string) {
  const idParam = pool === 'all2' ? { id: activationId } : { id: activationId };
  const data = await benotpRequest(pool, { action: 'getStatus', ...idParam });

  if (typeof data === 'string') {
    if (data.startsWith('STATUS_OK')) {
      return { status: 'completed' as const, code: data.split(':')[1] || null };
    }
    if (data === 'STATUS_WAIT_CODE') return { status: 'pending' as const, code: null };
    if (data === 'STATUS_CANCEL') return { status: 'cancelled' as const, code: null };
    return { status: 'unknown' as const, code: null, raw: data };
  }
  return { status: 'unknown' as const, code: null, raw: data };
}

// setStatus status=8 cancels/refunds the number, mirroring the convention
// already used for TigerSMS. Same defensive dual-shape handling as the
// cancelActivation fix applied there, since this is a sibling endpoint
// family and could plausibly return JSON instead of the bare "1" string.
export async function cancelNumber(pool: BenotpPool, activationId: string) {
  const data = await benotpRequest(pool, { action: 'setStatus', id: activationId, status: 8 });

  if (typeof data === 'string') {
    if (data === '1' || data.toUpperCase() === 'ACCESS_CANCEL') {
      return { success: true };
    }
    throw new Error(`Failed to cancel BenOTP (${poolLabel(pool)}) activation: ${data}`);
  }
  if (data && typeof data === 'object') {
    const looksSuccessful =
      data.success === true || data.status === 'success' || data.status === 'ok' ||
      String(data.status).toUpperCase() === 'ACCESS_CANCEL';
    if (looksSuccessful) return { success: true };
    throw new Error(`Failed to cancel BenOTP (${poolLabel(pool)}) activation: ${JSON.stringify(data)}`);
  }
  throw new Error(`Failed to cancel BenOTP (${poolLabel(pool)}) activation: ${JSON.stringify(data)}`);
}

export interface BenotpService {
  service: string;
  name: string;
  price: number;
  available: boolean | null;
  repeatable: boolean;
}

// usa1 (handler_api.php) getServices: flat object keyed by service code, no
// envelope. e.g. { "snapchat": { "name": "Snapchat", "price": "102.17", ... } }
// Confirmed via a real getServices call on 2026-07-18 - price already has
// any account-level discount applied per BenOTP's pricing docs, so this is
// the number to mark up and show, not original_price.
async function getUsa1Services(): Promise<BenotpService[]> {
  const data = await benotpRequest('usa1', { action: 'getServices' });
  if (typeof data === 'string') {
    throw new Error(`BenOTP (${poolLabel('usa1')}) getServices error: ${data}`);
  }
  if (!data || typeof data !== 'object') {
    throw new Error(`BenOTP (${poolLabel('usa1')}) returned an unrecognized getServices response`);
  }
  return Object.entries(data).map(([code, s]: [string, any]) => ({
    service: code,
    name: s?.name || code,
    price: parseFloat(s?.price) || 0,
    available: null, // usa1's getServices doesn't expose stock, unlike usa2
    repeatable: !!s?.repeatable,
  }));
}

// usa2 (sms.php) getServices: wrapped in {status, services}, field names
// differ from usa1 (service_name instead of name), and it additionally
// exposes `available`/`ltr_available` booleans that usa1 does not.
// Confirmed via a real getServices call on 2026-07-18.
async function getUsa2Services(): Promise<BenotpService[]> {
  const data = await benotpRequest('usa2', { action: 'getServices' });
  if (typeof data === 'string') {
    throw new Error(`BenOTP (${poolLabel('usa2')}) getServices error: ${data}`);
  }
  if (!data || typeof data !== 'object' || data.status !== 'ok' || !data.services) {
    throw new Error(`BenOTP (${poolLabel('usa2')}) returned an unrecognized getServices response`);
  }
  return Object.entries(data.services as Record<string, any>).map(([code, s]) => ({
    service: s?.service_id || code,
    name: s?.service_name || code,
    price: parseFloat(s?.price) || 0,
    available: typeof s?.available === 'boolean' ? s.available : null,
    repeatable: !!s?.repeatable,
  }));
}

// Bulk PRICED catalog - usa1 and usa2 only. all1/all2 do have their own
// getServices actions (see getAll1Services/getAll2Services below), but
// those return an unpriced ID->name directory, not a browsable price list -
// getting an actual price on those two pools still means calling
// getAll1Price/getAll2Price for one specific service+country at a time.
export async function getServices(pool: 'usa1' | 'usa2'): Promise<BenotpService[]> {
  if (pool === 'usa1') return getUsa1Services();
  return getUsa2Services();
}

export interface BenotpPriceQuote {
  service: string;
  price: number;
  count: number;
}

// all1 (handler.php) getPrice: single service+country lookup, returns a
// bare colon-delimited string "ACCESS_PRICE:<price>:<count>" - confirmed
// live on 2026-07-18 (e.g. "ACCESS_PRICE:2698.87:74"). This is still the
// only way to get an actual price - see getAll1Services below for what
// getServices actually returns instead.
export async function getAll1Price(
  service: string,
  country: string,
  areaCode?: string
): Promise<BenotpPriceQuote> {
  const data = await benotpRequest('all1', { action: 'getPrice', service, country, areacode: areaCode });

  if (typeof data !== 'string') {
    throw new Error(`BenOTP (${poolLabel('all1')}) returned an unrecognized getPrice response`);
  }
  const parts = data.split(':');
  if (parts[0] !== 'ACCESS_PRICE' || parts.length < 3) {
    throw new Error(`BenOTP (${poolLabel('all1')}) could not price this service/country: ${data}`);
  }
  return { service, price: parseFloat(parts[1]) || 0, count: parseInt(parts[2], 10) || 0 };
}

// all2 (all_server_2.php) getPrices: same single service+country(+areacode)
// lookup as all1's getPrice, just pluralized and on a different endpoint -
// confirmed to accept the same params (see benotp.com's own API console).
// Kept defensive on the response shape since it hasn't been run live yet,
// but tries the same bare "ACCESS_PRICE:<price>:<count>" format first
// since it's the same underlying protocol family as every other pool here.
export async function getAll2Price(
  service: string,
  country: string,
  areaCode?: string
): Promise<BenotpPriceQuote> {
  const data = await benotpRequest('all2', { action: 'getPrices', service, country, areacode: areaCode });

  if (typeof data === 'string') {
    const parts = data.split(':');
    if (parts[0] === 'ACCESS_PRICE' && parts.length >= 3) {
      return { service, price: parseFloat(parts[1]) || 0, count: parseInt(parts[2], 10) || 0 };
    }
    throw new Error(`BenOTP (${poolLabel('all2')}) could not price this service/country: ${data}`);
  }
  if (data && typeof data === 'object') {
    const price = parseFloat(data.price ?? data.cost ?? data.ACCESS_PRICE);
    const count = parseInt(data.count ?? data.quantity ?? data.available, 10);
    if (!isNaN(price)) return { service, price, count: isNaN(count) ? 0 : count };
  }
  throw new Error(`BenOTP (${poolLabel('all2')}) returned an unrecognized getPrices response`);
}

export interface BenotpServiceDirectoryEntry {
  service: string;
  name: string;
}

// all1's getServices (handler.php?action=getServices, no country param) is
// NOT a priced catalog like usa1/usa2's getServices - confirmed live on
// 2026-07-18, it's a flat platform-wide directory mapping a numeric service
// ID straight to a display name, e.g. {"1106":{"name":"101Sweets"}, ...},
// with no price/country/pool scoping at all. This is only good for turning
// a cryptic ID into a real name for a picker - getAll1Price above is still
// the only way to get an actual price for a specific service+country.
export async function getAll1Services(): Promise<BenotpServiceDirectoryEntry[]> {
  const data = await benotpRequest('all1', { action: 'getServices' });
  if (!data || typeof data !== 'object') {
    throw new Error(`BenOTP (${poolLabel('all1')}) returned an unrecognized getServices response`);
  }
  return Object.entries(data as Record<string, any>).map(([code, s]) => ({
    service: code,
    name: s?.name || code,
  }));
}

// all2's getServices takes an optional `country` filter per benotp.com's
// own API console, but hasn't been run live yet - assumed to return the
// same flat ID->name directory shape as all1's until confirmed otherwise.
export async function getAll2Services(country?: string): Promise<BenotpServiceDirectoryEntry[]> {
  const data = await benotpRequest('all2', { action: 'getServices', country });
  if (!data || typeof data !== 'object') {
    throw new Error(`BenOTP (${poolLabel('all2')}) returned an unrecognized getServices response`);
  }
  return Object.entries(data as Record<string, any>).map(([code, s]) => ({
    service: code,
    name: s?.name || code,
  }));
}

export async function getBalance(pool: BenotpPool): Promise<number> {
  const data = await benotpRequest(pool, { action: 'getBalance' });
  if (typeof data === 'string') {
    const match = data.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }
  if (data && typeof data === 'object' && data.balance !== undefined) {
    return parseFloat(data.balance);
  }
  return 0;
}
