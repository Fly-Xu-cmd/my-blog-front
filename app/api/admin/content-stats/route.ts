import { prisma } from "@/lib/prisma";
import { admin, endpoint, json } from "@/lib/api";
import { cached } from "@/lib/analytics-cache";
import { readReading, publicReading } from "@/lib/reading-entry";
import { reportRange } from "@/lib/report-range";
export const GET = endpoint(async (req: Request) => {
  await admin(req);
  const { start, end, dates, startDate, endDate } = reportRange(
    new URL(req.url).searchParams,
    "30d",
  );
  const data = await cached(
    "content-overview-v3:" +
      new URL(process.env.DATABASE_URL!).pathname +
      ":" +
      startDate +
      ":" +
      endDate,
    async () => {
      const [
        counts,
        created,
        published,
        categories,
        posts,
        notes,
        dynamics,
        pendingFeedback,
        fields,
        reading,
      ] = await Promise.all([
        prisma.$queryRaw<
          { kind: string; total: bigint; published: bigint | null }[]
        >`SELECT 'post' kind,COUNT(*) total,SUM(published) published FROM Post UNION ALL SELECT 'TECH',COUNT(*),SUM(published) FROM Note WHERE kind='TECH' UNION ALL SELECT 'ESSAY',COUNT(*),SUM(published) FROM Note WHERE kind='ESSAY' UNION ALL SELECT 'dynamic',COUNT(*),SUM(published) FROM Dynamic`,
        prisma.$queryRaw<
          { date: string; kind: string; count: bigint }[]
        >`SELECT DATE_FORMAT(CONVERT_TZ(createdAt,'+00:00','+08:00'),'%Y-%m-%d') date,'post' kind,COUNT(*) count FROM Post WHERE createdAt>=${start} AND createdAt<${end} GROUP BY date UNION ALL SELECT DATE_FORMAT(CONVERT_TZ(createdAt,'+00:00','+08:00'),'%Y-%m-%d'),kind,COUNT(*) FROM Note WHERE createdAt>=${start} AND createdAt<${end} GROUP BY 1,kind UNION ALL SELECT DATE_FORMAT(CONVERT_TZ(createdAt,'+00:00','+08:00'),'%Y-%m-%d'),'dynamic',COUNT(*) FROM Dynamic WHERE createdAt>=${start} AND createdAt<${end} GROUP BY 1`,
        prisma.$queryRaw<
          { date: string; kind: string; count: bigint }[]
        >`SELECT DATE_FORMAT(CONVERT_TZ(publishedAt,'+00:00','+08:00'),'%Y-%m-%d') date,'post' kind,COUNT(*) count FROM Post WHERE publishedAt>=${start} AND publishedAt<${end} GROUP BY date UNION ALL SELECT DATE_FORMAT(CONVERT_TZ(publishedAt,'+00:00','+08:00'),'%Y-%m-%d'),kind,COUNT(*) FROM Note WHERE publishedAt>=${start} AND publishedAt<${end} GROUP BY 1,kind UNION ALL SELECT DATE_FORMAT(CONVERT_TZ(publishedAt,'+00:00','+08:00'),'%Y-%m-%d'),'dynamic',COUNT(*) FROM Dynamic WHERE publishedAt>=${start} AND publishedAt<${end} GROUP BY 1`,
        prisma.$queryRaw<
          { name: string; count: bigint }[]
        >`SELECT COALESCE(c.name,'未分类') name,COUNT(*) count FROM Post p LEFT JOIN Category c ON p.categoryId=c.id WHERE p.published=true GROUP BY c.name`,
        prisma.post.findMany({
          take: 6,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            slug: true,
            title: true,
            published: true,
            updatedAt: true,
          },
        }),
        prisma.note.findMany({
          take: 6,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            slug: true,
            title: true,
            published: true,
            kind: true,
            updatedAt: true,
          },
        }),
        prisma.dynamic.findMany({
          take: 6,
          orderBy: { updatedAt: "desc" },
          select: { id: true, title: true, published: true, updatedAt: true },
        }),
        prisma.feedback.count({ where: { status: "NEW" } }),
        readReading(),
        publicReading(),
      ]);
      const mapRows = (
        rows: { date: string; kind: string; count: bigint }[],
      ) => {
        const values = new Map(
          rows.map((r) => [r.date + ":" + r.kind, Number(r.count)]),
        );
        return dates.flatMap((date) =>
          ["post", "TECH", "ESSAY", "dynamic"].map((kind) => ({
            date,
            kind,
            count: values.get(date + ":" + kind) ?? 0,
          })),
        );
      };
      return {
        startDate,
        endDate,
        counts: counts.map((r) => ({
          kind: r.kind,
          total: Number(r.total),
          published: Number(r.published ?? 0),
          drafts: Number(r.total) - Number(r.published ?? 0),
        })),
        createdTimeline: mapRows(created),
        publishedTimeline: mapRows(published),
        categories: categories.map((r) => ({ ...r, count: Number(r.count) })),
        recent: [
          ...posts.map((r) => ({ ...r, kind: "post" })),
          ...notes.map((r) => ({ ...r, kind: r.kind, resource: "note" })),
          ...dynamics.map((r) => ({ ...r, kind: "dynamic" })),
        ]
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, 6),
        pendingFeedback,
        readingEntry: {
          featuredTitle: reading.featured?.title ?? null,
          featuredConfigured: !!fields.featuredPostId,
          startCount: reading.starts.length,
          seriesCount: reading.series.length,
          unavailableCount:
            (fields.featuredPostId && !reading.featured ? 1 : 0) +
            fields.startPostIds.length -
            reading.starts.length +
            fields.recommendedSeriesIds.length -
            reading.series.length,
        },
        updatedAt: new Date().toISOString(),
      };
    },
  );
  return json({ ok: true, data });
});
