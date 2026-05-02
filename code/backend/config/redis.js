"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _ioredis = require('ioredis'); var _ioredis2 = _interopRequireDefault(_ioredis);

let redisClient = null;

 function getRedis() {
  if (!redisClient) {
    redisClient = new (0, _ioredis2.default)(process.env.REDIS_URL || "redis://localhost:6379", {
      // Keep API requests responsive when Redis is unavailable.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 10000,
      retryStrategy(times) {
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on("error", (error) => {
      console.error("Redis connection error:", error.message);
    });
  }
  return redisClient;
} exports.getRedis = getRedis;

 async function cacheGet(key) {
  try {
    const val = await getRedis().get(key);
    if (!val) return null;
    return JSON.parse(val) ;
  } catch (error) {
    console.error(`Redis cacheGet failed for key "${key}":`, error.message);
    return null;
  }
} exports.cacheGet = cacheGet;

 async function cacheSet(
  key,
  value,
  ttlSeconds = 3600
) {
  try {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error(`Redis cacheSet failed for key "${key}":`, error.message);
  }
} exports.cacheSet = cacheSet;

 async function cacheDel(key) {
  try {
    await getRedis().del(key);
  } catch (error) {
    console.error(`Redis cacheDel failed for key "${key}":`, error.message);
  }
} exports.cacheDel = cacheDel;
