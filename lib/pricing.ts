import dbConnect from './mongodb';
import PricingSettings from '@/models/PricingSettings';

// Single source of truth for USD -> NGN conversion used across the
// virtual-number feature. Previously this rate (1550) was hardcoded
// separately in both the buy route and the frontend page, so a future
// rate change would silently go out of sync between what the user is
// quoted and what they're actually charged.
export const USD_TO_NGN_RATE = parseFloat(process.env.USD_TO_NGN_RATE || '1550');

export function toNgn(usdPrice: number): number {
  return parseFloat((usdPrice * USD_TO_NGN_RATE).toFixed(2));
}

export type MarkupCategory = 'numbers' | 'smm' | 'accounts';

const DEFAULT_MARKUPS: Record<MarkupCategory, number> = {
  numbers: 20,
  smm: 20,
  accounts: 20,
};

// Short-lived in-memory cache so a busy listing endpoint isn't hitting the
// DB on every request. On serverless this only helps within a warm
// instance (each cold start re-reads from the DB), so correctness never
// depends on it - it's a pure optimization, and admin changes always show
// up within CACHE_TTL_MS at worst.
let cache: { markups: Record<MarkupCategory, number>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getMarkups(): Promise<Record<MarkupCategory, number>> {
  if (cache && cache.expiresAt > Date.now()) return cache.markups;

  await dbConnect();
  const doc = await PricingSettings.findOne({ key: 'pricing' });

  const markups: Record<MarkupCategory, number> = {
    numbers: doc?.markups?.numbers ?? DEFAULT_MARKUPS.numbers,
    smm: doc?.markups?.smm ?? DEFAULT_MARKUPS.smm,
    accounts: doc?.markups?.accounts ?? DEFAULT_MARKUPS.accounts,
  };

  cache = { markups, expiresAt: Date.now() + CACHE_TTL_MS };
  return markups;
}

export function invalidateMarkupCache() {
  cache = null;
}

// Applies a percentage markup on top of a raw provider cost. A negative
// percent (discount) is allowed down to -99, so a price can never be
// dropped to zero/negative by a fat-fingered admin entry.
export function computeMarkup(baseCost: number, percent: number): number {
  const safePercent = Math.max(percent, -99);
  return parseFloat((baseCost * (1 + safePercent / 100)).toFixed(2));
}
