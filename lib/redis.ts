import { Redis } from "ioredis";

// 使用 global 变量防止在 Next.js 热更新 (HMR) 期间多次实例化连接
const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis({
    port: Number(process.env.REDIS_PORT) || 6379, // 端口
    host: process.env.REDIS_HOST || "127.0.0.1", // 地址
    password: process.env.REDIS_PASSWORD || "123456",
    db: 0, // 数据库索引
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
