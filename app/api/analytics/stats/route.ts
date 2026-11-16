import { prisma } from '@/lib/prisma';
import { admin, ApiError, endpoint, json } from '@/lib/api';
import { shanghaiDayStartUtc } from '@/lib/analytics';
export const GET = endpoint(async (req: Request) => {
  await admin(req);
  const range = new URL(req.url).searchParams.get('range') ?? '7d';
  if (range !== '7d' && range !== '30d') throw new ApiError(400, 'INVALID_RANGE');
  const days = range === '7d' ? 7 : 30,
    todayStart = shanghaiDayStartUtc(),
    start = shanghaiDayStartUtc(days - 1),
    end = shanghaiDayStartUtc(-1);
  const [todayPv, todayUv, trendRows, topRows, refRows] = await prisma.$transaction([
    prisma.pageView.count({ where: { createdAt: { gte: todayStart, lt: end } } }),
    prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(DISTINCT visitorId) count FROM PageView WHERE createdAt >= ${todayStart} AND createdAt < ${end}`,
    prisma.$queryRaw<
      { date: string; pv: bigint; uv: bigint }[]
    >`SELECT DATE_FORMAT(CONVERT_TZ(createdAt,'+00:00','+08:00'),'%Y-%m-%d') date,COUNT(*) pv,COUNT(DISTINCT visitorId) uv FROM PageView WHERE createdAt >= ${start} AND createdAt < ${end} GROUP BY date ORDER BY date`,
    prisma.$queryRaw<
      { path: string; count: bigint }[]
    >`SELECT CASE WHEN path='/frontend' THEN '/' WHEN path LIKE '/frontend/%' THEN SUBSTRING(path,10) ELSE path END path,COUNT(*) count FROM PageView WHERE createdAt >= ${start} AND createdAt < ${end} GROUP BY CASE WHEN path='/frontend' THEN '/' WHEN path LIKE '/frontend/%' THEN SUBSTRING(path,10) ELSE path END ORDER BY count DESC,path ASC LIMIT 10`,
    prisma.$queryRaw<
      { host: string; count: bigint }[]
    >`SELECT referrerHost host,COUNT(*) count FROM PageView WHERE referrerHost IS NOT NULL AND createdAt >= ${start} AND createdAt < ${end} GROUP BY referrerHost ORDER BY count DESC LIMIT 10`,
  ]);
  const map = new Map(trendRows.map((r) => [r.date, { pv: Number(r.pv), uv: Number(r.uv) }]));
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const trend = Array.from({ length: days }, (_, i) => {
    const date = fmt.format(shanghaiDayStartUtc(days - 1 - i));
    return { date, ...(map.get(date) ?? { pv: 0, uv: 0 }) };
  });
  return json({
    today: { pv: todayPv, uv: Number(todayUv[0]?.count ?? 0) },
    trend,
    topPages: topRows.map((r) => ({ path: r.path, count: Number(r.count) })),
    referrers: refRows.map((r) => ({ host: r.host, count: Number(r.count) })),
    range,
    start: start.toISOString(),
    end: end.toISOString(),
  });
});
