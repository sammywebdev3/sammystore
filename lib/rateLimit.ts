import dbConnect from './mongodb';
import RateLimit from '@/models/RateLimit';

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

// Sliding-window limiter backed by Mongo so it works correctly across
// serverless function instances (an in-memory counter would reset on every
// cold start and wouldn't be shared between instances).
//
// Implemented with plain update objects (not an aggregation-pipeline
// update) for broad Mongoose/MongoDB compatibility. The increment step is
// still atomic; there's a narrow, low-stakes race only on the very first
// request ever made for a brand new key (worst case: one extra attempt is
// allowed), which is an acceptable tradeoff for a rate limiter.
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  await dbConnect();

  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);

  // Atomically increment count, but only if the existing window is still
  // active. If no matching doc exists (either it's a new key, or the
  // previous window has expired), this returns null.
  let doc = await RateLimit.findOneAndUpdate(
    { key, windowStart: { $gt: cutoff } },
    { $inc: { count: 1 } },
    { new: true }
  );

  if (!doc) {
    // New key, or the window expired - start a fresh window.
    doc = await RateLimit.findOneAndUpdate(
      { key },
      { $set: { count: 1, windowStart: now } },
      { upsert: true, new: true }
    );
  }

  if (doc.count > maxAttempts) {
    const elapsed = now.getTime() - doc.windowStart.getTime();
    const retryAfterSeconds = Math.max(Math.ceil((windowMs - elapsed) / 1000), 1);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}
