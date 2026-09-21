import { isProductionEnvironment } from "@/lib/constants";
import { ChatbotError } from "@/lib/errors";

const MAX_MESSAGES = 10;
const TTL_MS = 60 * 60 * 1000;

type Bucket = { count: number; resetAt: number };

// In-memory rate limiter — replaces the Redis-backed limiter in local
// deployments where Redis is not available.
const buckets = new Map<string, Bucket>();

function sweepExpiredBuckets() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

// Async signature kept intentionally: a Redis-backed limiter can replace the
// in-memory implementation without any changes at call sites.
export function checkIpRateLimit(ip: string | undefined): Promise<void> {
  if (!isProductionEnvironment || !ip) {
    return Promise.resolve();
  }

  const now = Date.now();
  sweepExpiredBuckets();

  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + TTL_MS });
    return Promise.resolve();
  }

  bucket.count += 1;

  if (bucket.count > MAX_MESSAGES) {
    return Promise.reject(new ChatbotError("rate_limit:chat"));
  }

  return Promise.resolve();
}
