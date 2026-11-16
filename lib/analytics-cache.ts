import { isIP } from 'node:net';
import { randomUUID } from 'crypto';
import { redis } from './redis';
import { prisma } from './prisma';
import { ApiError } from './api';
const inFlight = new Map<string, Promise<unknown>>();
export async function cached<T>(name: string, load: () => Promise<T>): Promise<T> {
  const key = 'analytics:cache:' + name;
  try {
    const existing = await redis.get(key);
    if (existing) return JSON.parse(existing) as T;
    if (inFlight.has(key)) return inFlight.get(key) as Promise<T>;
    const promise = (async () => {
      const token = randomUUID();
      const lock = key + ':lock';
      if (!(await redis.set(lock, token, 'EX', 30, 'NX'))) {
        for (let i = 0; i < 20; i++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const ready = await redis.get(key);
          if (ready) return JSON.parse(ready) as T;
        }
        throw new ApiError(503, 'ANALYTICS_BUSY');
      }
      try {
        const result = await load();
        await redis.set(key, JSON.stringify(result), 'EX', 60);
        return result;
      } finally {
        await redis
          .eval(
            "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",
            1,
            lock,
            token,
          )
          .catch(() => {});
      }
    })();
    inFlight.set(key, promise);
    try {
      return await promise;
    } finally {
      inFlight.delete(key);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, 'ANALYTICS_UNAVAILABLE');
  }
}
export const siteTotals = () =>
  cached('totals', async () => {
    const [pv, rows] = await Promise.all([
      prisma.pageView.count(),
      prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(DISTINCT visitorId) count FROM PageView`,
    ]);
    return { pv, uv: Number(rows[0]?.count ?? 0) };
  });
export async function rateLimit(req: Request, type: 'track' | 'heartbeat') {
  const trust = process.env.TRUST_PROXY === 'true';
  const ip = trust ? req.headers.get('x-real-ip') : 'untrusted';
  if (trust && (!ip || !isIP(ip))) throw new ApiError(503, 'TRUSTED_IP_REQUIRED');
  const limit = Number(
    process.env[type === 'track' ? 'PV_RATE_LIMIT' : 'HEARTBEAT_RATE_LIMIT'] ??
      (type === 'track' ? '120' : '180'),
  );
  if (!Number.isSafeInteger(limit) || limit < 1) throw new ApiError(503, 'INVALID_RATE_CONFIG');
  try {
    const value = (await redis.eval(
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return {n,redis.call('TTL',KEYS[1])}",
      1,
      'analytics:rate:' + type + ':' + ip,
    )) as [number, number];
    if (value[0] > limit) throw new ApiError(429, 'RATE_LIMITED', String(Math.max(value[1], 1)));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, 'ANALYTICS_UNAVAILABLE');
  }
}
