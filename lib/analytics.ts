import crypto from "crypto";
import jwt from "jsonwebtoken";
import { redis } from "@/lib/redis";

// 在线访客 ZSET 的 Redis Key（member 为 visitorId，score 为最近一次心跳的时间戳）
const ONLINE_KEY = "analytics:online";

// 在线判定窗口（毫秒）：最近 120 秒内有心跳即视为在线
const ONLINE_WINDOW_MS = 120_000;

/**
 * 校验匿名访客 ID 是否为合法的小写 UUID v4 且长度不超过 64
 * @param v 待校验的访客 ID 字符串
 * @returns 合法返回 true，否则返回 false
 */
export function isValidVisitorId(v: string): boolean {
  return (
    v.length <= 64 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v)
  );
}

/**
 * 校验页面路径是否合法（非空且长度不超过 512）
 * @param p 待校验的页面路径
 * @returns 合法返回 true，否则返回 false
 */
export function isValidPath(p: string): boolean {
  return p.length > 0 && p.length <= 512;
}

/**
 * 记录访客心跳并返回当前在线人数：
 * ZADD 写入心跳时间戳 -> ZREMRANGEBYSCORE 清理过期成员 -> ZCOUNT 统计在线人数
 * @param visitorId 匿名访客 ID
 * @returns 当前在线人数（最近 120 秒内有心跳的访客数）
 */
export async function touchHeartbeat(visitorId: string): Promise<number> {
  const now = Date.now();
  const windowStart = now - ONLINE_WINDOW_MS;
  await redis.zadd(ONLINE_KEY, now, visitorId);
  await redis.zremrangebyscore(ONLINE_KEY, "-inf", `(${windowStart}`);
  return redis.zcount(ONLINE_KEY, windowStart, "+inf");
}

/**
 * 获取当前在线人数（先清理过期成员，再 ZCOUNT 统计，不写入新心跳）
 * @returns 当前在线人数
 */
export async function getOnlineCount(): Promise<number> {
  const now = Date.now();
  const windowStart = now - ONLINE_WINDOW_MS;
  await redis.zremrangebyscore(ONLINE_KEY, "-inf", `(${windowStart}`);
  return redis.zcount(ONLINE_KEY, windowStart, "+inf");
}

/**
 * 尝试获取 PV 防重锁：同一 visitorId + path 组合在 10 秒内只允许计一次 PV。
 * 通过 SET key value EX 10 NX 单条原子命令实现（严禁先查再写）
 * @param visitorId 匿名访客 ID
 * @param path 页面路径
 * @returns 首次访问（成功获取锁）返回 true，10 秒内重复访问返回 false
 */
export async function tryAcquirePvDedup(
  visitorId: string,
  path: string
): Promise<boolean> {
  const digest = crypto.createHash("sha1").update(path).digest("hex").slice(0, 16);
  const result = await redis.set(
    `analytics:dedup:${visitorId}:${digest}`,
    "1",
    "EX",
    10,
    "NX"
  );
  return result === "OK";
}

/**
 * 校验请求的管理员身份：解析 Authorization: Bearer <token> 并用 JWT_SECRET 验证
 * @param req 请求对象
 * @returns 验证通过返回 { ok: true, username }；token 缺失或无效返回 401；token 有效但用户名不匹配返回 403
 */
export async function requireAdmin(
  req: Request
): Promise<{ ok: true; username: string } | { ok: false; status: 401 | 403 }> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return { ok: false, status: 401 };
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "");
    const username =
      typeof payload === "object" && payload !== null
        ? (payload as jwt.JwtPayload).username
        : undefined;
    if (typeof username !== "string" || username !== process.env.ADMIN_USERNAME) {
      return { ok: false, status: 403 };
    }
    return { ok: true, username };
  } catch {
    return { ok: false, status: 401 };
  }
}

/**
 * 计算上海时区某自然日零点对应的 UTC Date 对象（用作 Prisma/SQL 中 createdAt 的 WHERE 边界）
 * @param offsetDays 向前偏移的天数（0 表示上海今日零点）
 * @returns 该日上海 00:00:00（UTC+8）对应的 UTC Date
 */
export function shanghaiDayStartUtc(offsetDays: number = 0): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = fmt.format(new Date()); // en-CA 区域恰好输出 'YYYY-MM-DD' 格式
  const base = new Date(`${today}T00:00:00+08:00`);
  // 上海时区无夏令时，直接减去整天毫秒数即可安全回退天数
  return new Date(base.getTime() - offsetDays * 24 * 60 * 60 * 1000);
}
