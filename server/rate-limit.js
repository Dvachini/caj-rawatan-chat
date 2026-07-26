export function createRateLimiter({ limit = 20, windowMs = 60000, now = Date.now } = {}) {
  const buckets = new Map();
  return (userId) => {
    const time = now();
    const bucket = buckets.get(userId);
    if (!bucket || time - bucket.startedAt >= windowMs) {
      buckets.set(userId, { count: 1, startedAt: time });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= limit;
  };
}
