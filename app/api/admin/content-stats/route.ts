import { prisma } from '@/lib/prisma';
import { admin, endpoint, json } from '@/lib/api';
export const GET = endpoint(async (req: Request) => {
  await admin(req);
  const [postTimeline, dynamicTimeline, categories] = await Promise.all([
    prisma.$queryRaw<
      { date: string; count: bigint }[]
    >`SELECT DATE_FORMAT(CONVERT_TZ(createdAt,'+00:00','+08:00'),'%Y-%m-%d') date, COUNT(*) count FROM Post GROUP BY date ORDER BY date`,
    prisma.$queryRaw<
      { date: string; count: bigint }[]
    >`SELECT DATE_FORMAT(CONVERT_TZ(createdAt,'+00:00','+08:00'),'%Y-%m-%d') date, COUNT(*) count FROM Dynamic GROUP BY date ORDER BY date`,
    prisma.$queryRaw<
      { name: string; count: bigint }[]
    >`SELECT COALESCE(c.name,'未分类') name,COUNT(*) count FROM Post p LEFT JOIN Category c ON p.categoryId=c.id GROUP BY c.name`,
  ]);
  return json({
    ok: true,
    data: {
      postTimeline: postTimeline.map((r) => ({ ...r, count: Number(r.count) })),
      dynamicTimeline: dynamicTimeline.map((r) => ({ ...r, count: Number(r.count) })),
      categories: categories.map((r) => ({ ...r, count: Number(r.count) })),
    },
  });
});
