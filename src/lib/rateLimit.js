// In-memory token bucket — fine for a single-node deployment. Swap the
// Map for a Redis-backed store if this ever runs across multiple instances.
const buckets = new Map();
const CAPACITY = 20;
const REFILL_PER_MINUTE = 10;

export function takeToken(key) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: CAPACITY, last: now };

  const elapsedMinutes = (now - bucket.last) / 60000;
  bucket.tokens = Math.min(CAPACITY, bucket.tokens + elapsedMinutes * REFILL_PER_MINUTE);
  bucket.last = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}
