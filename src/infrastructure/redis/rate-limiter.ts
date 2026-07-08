import { redis } from "./redis-client";

export async function rateLimit(identifier: string, limit: number, windowInSeconds: number) {
  if (!redis) {
    // If Redis is not available, we skip rate limiting or implement a basic memory fallback
    return { success: true, remaining: limit };
  }

  const key = `rate_limit:${identifier}`;
  
  try {
    const current = await redis.get<number>(key) || 0;
    
    if (current >= limit) {
      return { success: false, remaining: 0 };
    }
    
    // Using atomic pipeline/multi is ideal, but Upstash REST allows standard ops
    // Note: Upstash incr sets TTL automatically only if using Lua script or expire after.
    // For simplicity:
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    if (current === 0) {
      pipeline.expire(key, windowInSeconds);
    }
    await pipeline.exec();
    
    return { success: true, remaining: limit - current - 1 };
  } catch (error) {
    console.error("Rate limit error", error);
    // Fail open
    return { success: true, remaining: 1 };
  }
}
