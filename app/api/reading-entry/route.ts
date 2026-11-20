import { admin, adminScope, body, endpoint, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  publicReading,
  readReading,
  readingFields,
  saveReading,
} from "@/lib/reading-entry";
export const GET = endpoint(async (req: Request) => {
  if (!(await adminScope(req)))
    return json({ ok: true, data: await publicReading() });
  const fields = await readReading();
  const [selectedPosts, selectedSeries] = await Promise.all([
    prisma.post.findMany({
      where: {
        id: {
          in: [
            ...fields.startPostIds,
            ...(fields.featuredPostId ? [fields.featuredPostId] : []),
          ],
        },
      },
      select: { id: true, title: true, published: true },
    }),
    prisma.series.findMany({
      where: { id: { in: fields.recommendedSeriesIds } },
      select: { id: true, name: true },
    }),
  ]);
  return json({ ok: true, data: { ...fields, selectedPosts, selectedSeries } });
});
export const PUT = endpoint(async (req: Request) => {
  await admin(req);
  const value = await body(req);
  const row = await saveReading(
    readingFields({ ...(await readReading()), ...value }),
    value.revision as number,
  );
  return json({
    ok: true,
    data: {
      ...readingFields(row.fields as Record<string, unknown>),
      revision: row.revision,
      updatedAt: row.updatedAt,
    },
  });
});
