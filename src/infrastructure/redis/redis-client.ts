import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Local fallback or Mock for dev if not configured
let redisClient: Redis | null = null;

if (redisUrl && redisToken) {
  redisClient = new Redis({
    url: redisUrl,
    token: redisToken,
  });
} else {
  console.warn("UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing. Redis caching will be disabled or mocked.");
  // Basic mock implementation for local dev without redis
  const mockStore = new Map<string, string>();
  
  redisClient = {
    get: async <T>(key: string): Promise<T | null> => {
      const val = mockStore.get(key);
      return val ? (JSON.parse(val) as T) : null;
    },
    set: async (key: string, value: any) => {
      mockStore.set(key, JSON.stringify(value));
      return "OK";
    },
    del: async (key: string) => {
      mockStore.delete(key);
      return 1;
    },
    // Add other required mock methods if needed
  } as unknown as Redis;
}

export const redis = redisClient;
