import { prisma } from "./prisma";
import { ApiError, idField } from "./api";
import { format, postSummary } from "./content";
export type ReadingFields = {
  featuredPostId: number | null;
  recommendedSeriesIds: number[];
  startPostIds: number[];
};
export const defaultReading: ReadingFields = {
  featuredPostId: null,
  recommendedSeriesIds: [],
  startPostIds: [],
};
export function readingFields(value: Record<string, unknown>): ReadingFields {
  const ids = (key: string) => {
    const input = value[key];
    if (!Array.isArray(input) || input.length > 3)
      throw new ApiError(400, "INVALID_READING_SELECTION");
    const result = input.map((id) => idField(id));
    if (
      result.some((id) => id == null) ||
      new Set(result).size !== result.length
    )
      throw new ApiError(400, "INVALID_READING_SELECTION");
    return result as number[];
  };
  return {
    featuredPostId: idField(value.featuredPostId) ?? null,
    recommendedSeriesIds: ids("recommendedSeriesIds"),
    startPostIds: ids("startPostIds"),
  };
}
export async function readReading() {
  const row = await prisma.readingEntry.findUnique({ where: { id: 1 } });
  return row
    ? {
        ...readingFields(row.fields as Record<string, unknown>),
        revision: row.revision,
        updatedAt: row.updatedAt,
      }
    : { ...defaultReading, revision: 0, updatedAt: null };
}
export async function saveReading(fields: ReadingFields, revision: number) {
  if (!Number.isInteger(revision) || revision < 0 || revision >= 2147483647)
    throw new ApiError(400, "INVALID_REVISION");
  const conflict = () =>
    new ApiError(
      409,
      "READING_VERSION_CONFLICT",
      "阅读入口已更新，请重新载入后保存",
    );
  try {
    return await prisma.$transaction(async (tx) => {
      const posts = [
        ...new Set(
          [fields.featuredPostId, ...fields.startPostIds].filter(
            (id): id is number => id !== null,
          ),
        ),
      ];
      if (
        (await tx.post.count({
          where: { id: { in: posts }, published: true },
        })) !== posts.length ||
        (await tx.series.count({
          where: {
            id: { in: fields.recommendedSeriesIds },
            posts: { some: { published: true } },
          },
        })) !== fields.recommendedSeriesIds.length
      )
        throw new ApiError(
          400,
          "READING_CONTENT_UNAVAILABLE",
          "请选择已公开文章及包含公开文章的系列",
        );
      if (revision === 0)
        return tx.readingEntry.create({ data: { id: 1, fields } });
      const count =
        await tx.$executeRaw`UPDATE ReadingEntry SET fields=${JSON.stringify(fields)}, revision=revision+1, updatedAt=NOW() WHERE id=1 AND revision=${revision}`;
      if (count !== 1) throw conflict();
      return tx.readingEntry.findUniqueOrThrow({ where: { id: 1 } });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") throw conflict();
    throw error;
  }
}
export async function publicReading() {
  const fields = await readReading();
  const ids = [
    ...new Set(
      [fields.featuredPostId, ...fields.startPostIds].filter(
        (id): id is number => id !== null,
      ),
    ),
  ];
  const [posts, series] = await Promise.all([
    prisma.post.findMany({
      where: { published: true, id: { in: ids } },
      select: postSummary,
    }),
    prisma.series.findMany({
      where: {
        id: { in: fields.recommendedSeriesIds },
        posts: { some: { published: true } },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: { select: { posts: { where: { published: true } } } },
      },
    }),
  ]);
  return {
    featured: posts.find((p) => p.id === fields.featuredPostId)
      ? format(posts.find((p) => p.id === fields.featuredPostId)!)
      : null,
    starts: fields.startPostIds.flatMap((id) => {
      const post = posts.find((p) => p.id === id);
      return post ? [format(post)] : [];
    }),
    series: fields.recommendedSeriesIds.flatMap((id) => {
      const row = series.find((s) => s.id === id);
      return row ? [row] : [];
    }),
  };
}
