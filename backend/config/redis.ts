import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      // Keep API requests responsive when Redis is unavailable.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 10_000,
      retryStrategy(times) {
        return Math.min(times * 200, 2_000);
      },
    });

    redisClient.on("error", (error) => {
      console.error("Redis connection error:", error.message);
    });
  }
  return redisClient;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await getRedis().get(key);
    if (!val) return null;
    return JSON.parse(val) as T;
  } catch (error: any) {
    console.error(`Redis cacheGet failed for key "${key}":`, error.message);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 3600
): Promise<void> {
  try {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error: any) {
    console.error(`Redis cacheSet failed for key "${key}":`, error.message);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await getRedis().del(key);
  } catch (error: any) {
    console.error(`Redis cacheDel failed for key "${key}":`, error.message);
  }
}
