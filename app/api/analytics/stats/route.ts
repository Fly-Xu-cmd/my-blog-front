import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, shanghaiDayStartUtc } from "@/lib/analytics";

/**
 * 管理端统计接口（GET /api/analytics/stats?range=7d|30d，默认 7d）
 * 需携带 Authorization: Bearer <token>，且 token 用户名须匹配 ADMIN_USERNAME。
 * 返回 { today: { pv, uv }, trend: [{ date, pv, uv }], topPages: [{ path, count }], referrers: [{ host, count }] }
 */
export async function GET(req: Request) {
  // 管理员鉴权：未登录/无效 token -> 401，已登录但非管理员 -> 403
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    if (auth.status === 401) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 解析并校验 range 查询参数（仅支持 7d / 30d，默认 7d）
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "7d";
  if (range !== "7d" && range !== "30d") {
    return NextResponse.json({ error: "invalid range" }, { status: 400 });
  }
  const days = range === "7d" ? 7 : 30;

  // 时间边界（上海时区自然日零点对应的 UTC 时刻）
  const todayStart = shanghaiDayStartUtc(0);
  const rangeStart = shanghaiDayStartUtc(days);

  // 今日 PV / UV（UV 的 COUNT(DISTINCT) 需用原生 SQL，BigInt 转 Number）
  const todayPv = await prisma.pageView.count({
    where: { createdAt: { gte: todayStart } },
  });
  const todayUvRows = await prisma.$queryRaw<
    Array<{ count: bigint }>
  >`SELECT COUNT(DISTINCT visitorId) AS count FROM PageView WHERE createdAt >= ${todayStart}`;
  const todayUv = Number(todayUvRows[0]?.count ?? 0);

  // 按上海时区分组统计趋势（GROUP BY / ORDER BY 全部在 MySQL 完成，tagged template 参数化）
  const trendRows = await prisma.$queryRaw<
    Array<{ date: string; pv: bigint; uv: bigint }>
  >`SELECT DATE_FORMAT(CONVERT_TZ(createdAt, '+00:00', '+08:00'), '%Y-%m-%d') AS date, COUNT(*) AS pv, COUNT(DISTINCT visitorId) AS uv FROM PageView WHERE createdAt >= ${rangeStart} GROUP BY date ORDER BY date`;
  const trendMap = new Map(
    trendRows.map((row) => [row.date, { pv: Number(row.pv), uv: Number(row.uv) }])
  );

  // Node 侧按 Asia/Shanghai 补齐连续日期序列，无数据的日期补 0
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const trend: Array<{ date: string; pv: number; uv: number }> = [];
  for (let i = days; i >= 0; i--) {
    const date = fmt.format(shanghaiDayStartUtc(i));
    const item = trendMap.get(date) ?? { pv: 0, uv: 0 };
    trend.push({ date, pv: item.pv, uv: item.uv });
  }

  // Top 10 页面（GROUP BY / ORDER BY / LIMIT 均在 MySQL 完成）
  const topRows = await prisma.pageView.groupBy({
    by: ["path"],
    _count: { _all: true },
    orderBy: { _count: { path: "desc" } },
    take: 10,
    where: { createdAt: { gte: rangeStart } },
  });
  const topPages = topRows.map((row) => ({ path: row.path, count: row._count._all }));

  // Top 10 来源域名（排除直访/无来源记录，referrerHost 为 null 的行）
  const refRows = await prisma.pageView.groupBy({
    by: ["referrerHost"],
    _count: { _all: true },
    orderBy: { _count: { referrerHost: "desc" } },
    take: 10,
    where: { referrerHost: { not: null } },
  });
  const referrers = refRows.map((row) => ({
    host: row.referrerHost,
    count: row._count._all,
  }));

  return NextResponse.json({
    today: { pv: todayPv, uv: todayUv },
    trend,
    topPages,
    referrers,
  });
}
