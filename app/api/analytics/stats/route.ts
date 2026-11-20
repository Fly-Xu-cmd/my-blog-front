import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { admin, ApiError, endpoint, json } from "@/lib/api";
import { shanghaiDayStartUtc } from "@/lib/analytics";
import { cached } from "@/lib/analytics-cache";
import { interactionDay } from "@/lib/interactions";
import { contentLinks } from "@/lib/content-links";
export const GET = endpoint(async (req: Request) => {
  await admin(req);
  const params = new URL(req.url).searchParams,
    range = params.get("range") ?? "7d",
    kind = params.get("kind") ?? "all";
  if (
    !["7d", "30d"].includes(range) ||
    !["all", "post", "TECH", "ESSAY"].includes(kind)
  )
    throw new ApiError(400, "INVALID_RANGE");
  const days = range === "7d" ? 7 : 30,
    todayStart = shanghaiDayStartUtc(),
    start = shanghaiDayStartUtc(days - 1),
    end = shanghaiDayStartUtc(-1);
  const path = Prisma.sql`CASE WHEN path='/frontend' THEN '/' WHEN path LIKE '/frontend/%' THEN SUBSTRING(path,10) ELSE path END`;
  const filter =
    kind === "all"
      ? Prisma.empty
      : kind === "post"
        ? Prisma.sql`AND ${path} LIKE '/posts/%'`
        : Prisma.sql`AND EXISTS (SELECT 1 FROM Note n WHERE CONCAT('/notes/',n.slug)=${path} AND n.kind=${kind})`;
  const data = await cached(
    "stats-v2:" +
      new URL(process.env.DATABASE_URL!).pathname +
      ":" +
      range +
      ":" +
      kind +
      ":" +
      todayStart.toISOString(),
    async () => {
      const [
        todayPv,
        todayUv,
        periodPv,
        periodUv,
        trendRows,
        topRows,
        refRows,
        events,
        feedback,
      ] = await Promise.all([
        prisma.pageView.count({
          where: { createdAt: { gte: todayStart, lt: end } },
        }),
        prisma.$queryRaw<
          { count: bigint }[]
        >`SELECT COUNT(DISTINCT visitorId) count FROM PageView WHERE createdAt>=${todayStart} AND createdAt<${end}`,
        prisma.pageView.count({
          where: { createdAt: { gte: start, lt: end } },
        }),
        prisma.$queryRaw<
          { count: bigint }[]
        >`SELECT COUNT(DISTINCT visitorId) count FROM PageView WHERE createdAt>=${start} AND createdAt<${end}`,
        prisma.$queryRaw<
          { date: string; pv: bigint; uv: bigint }[]
        >`SELECT DATE_FORMAT(CONVERT_TZ(createdAt,'+00:00','+08:00'),'%Y-%m-%d') date,COUNT(*) pv,COUNT(DISTINCT visitorId) uv FROM PageView WHERE createdAt>=${start} AND createdAt<${end} GROUP BY date ORDER BY date`,
        prisma.$queryRaw<{ path: string; count: bigint }[]>(
          Prisma.sql`SELECT ${path} path,COUNT(*) count FROM PageView WHERE createdAt>=${start} AND createdAt<${end} ${filter} GROUP BY ${path} ORDER BY count DESC,path ASC LIMIT 10`,
        ),
        prisma.$queryRaw<
          { host: string; count: bigint }[]
        >`SELECT referrerHost host,COUNT(*) count FROM PageView WHERE referrerHost IS NOT NULL AND createdAt>=${start} AND createdAt<${end} GROUP BY referrerHost ORDER BY count DESC LIMIT 10`,
        prisma.interactionDaily.groupBy({
          by: ["event"],
          where: {
            day: { gte: interactionDay(days - 1), lte: interactionDay() },
          },
          _sum: { count: true },
        }),
        prisma.feedback.groupBy({
          by: ["status"],
          where: { createdAt: { gte: start, lt: end } },
          _count: { _all: true },
        }),
      ]);
      const links = await contentLinks(topRows.map((r) => r.path));
      const map = new Map(
        trendRows.map((r) => [r.date, { pv: Number(r.pv), uv: Number(r.uv) }]),
      );
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const trend = Array.from({ length: days }, (_, i) => {
        const date = fmt.format(shanghaiDayStartUtc(days - 1 - i));
        return { date, ...(map.get(date) ?? { pv: 0, uv: 0 }) };
      });
      const interactions = Object.fromEntries(
        events.map((r) => [r.event, r._sum.count ?? 0]),
      );
      return {
        today: { pv: todayPv, uv: Number(todayUv[0]?.count ?? 0) },
        period: { pv: periodPv, uv: Number(periodUv[0]?.count ?? 0) },
        trend,
        topPages: topRows.map((r) => ({
          ...links.get(r.path),
          path: r.path,
          count: Number(r.count),
        })),
        referrers: refRows.map((r) => ({ ...r, count: Number(r.count) })),
        interactions,
        feedback: feedback.map((r) => ({
          status: r.status,
          count: r._count._all,
        })),
        range,
        kind,
        start: start.toISOString(),
        end: end.toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  );
  return json(data);
});
