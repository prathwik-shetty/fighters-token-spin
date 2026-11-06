/**
 * Simple, efficient in-memory rate limiter and round lock.
 * Prevents race conditions and spam attacks on spin endpoints.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const activeSpinLocks = new Set<string>();

/**
 * Checks whether an IP or key has exceeded the rate limit.
 * Default: 10 spin requests per 60 seconds per IP.
 */
export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count };
}

/**
 * Acquire an active spin lock for a round ID.
 * Returns true if locked successfully, or false if a spin is already in progress.
 */
export function acquireSpinLock(roundId: string): boolean {
  if (activeSpinLocks.has(roundId)) {
    return false;
  }
  activeSpinLocks.add(roundId);
  return true;
}

/**
 * Release the active spin lock for a round ID.
 */
export function releaseSpinLock(roundId: string): void {
  activeSpinLocks.delete(roundId);
}
