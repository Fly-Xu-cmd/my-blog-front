import { prisma } from "@/lib/prisma";
import {
  admin,
  adminScope,
  ApiError,
  body,
  endpoint,
  idField,
  json,
  textField,
} from "@/lib/api";
import { Prisma } from "@prisma/client";
import {
  categoryField,
  contentFields,
  detail,
  format,
  relations,
  seriesFields,
  tagWrite,
} from "@/lib/content";
import {
  expectedRevision,
  lockedPost,
  recordRevision,
} from "@/lib/post-revisions";
type Context = { params: Promise<{ slug: string }> };
export const GET = endpoint(async (req: Request, ctx: Context) =>
  json({
    ok: true,
    data: await detail("post", (await ctx.params).slug, await adminScope(req)),
  }),
);
export const PUT = endpoint(async (req: Request, ctx: Context) => {
  const actor = await admin(req);
  const { slug } = await ctx.params;
  const data = await body(req);
  if (data.slug !== undefined && data.slug !== slug)
    throw new ApiError(409, "SLUG_IMMUTABLE");
  const fields = contentFields(data);
  const revision = expectedRevision(data.revision);
  if (fields.title !== undefined) textField(fields.title, 255, true);
  if (fields.content !== undefined) textField(fields.content, 4_000_000, true);
  const result = await prisma.$transaction(
    async (tx) => {
      // Match series reordering's lock order: series first, then the article.
      const initial = await tx.post.findUnique({
        where: { slug },
        select: { seriesId: true },
      });
      if (!initial) throw new ApiError(404, "NOT_FOUND");
      const categoryId = await categoryField(data.categoryId, tx);
      const tags =
        data.tags === undefined
          ? undefined
          : { deleteMany: {}, ...(await tagWrite(data.tags, tx)) };
      const seriesIds = [initial.seriesId, idField(data.seriesId)].filter(
        (id): id is number => !!id,
      );
      for (const id of [...new Set(seriesIds)].sort((a, b) => a - b))
        await tx.$queryRaw`SELECT id FROM Series WHERE id = ${id} FOR UPDATE`;
      const existing = await lockedPost(tx, slug, revision);
      if (existing.seriesId !== initial.seriesId)
        throw new ApiError(409, "POST_VERSION_CONFLICT");
      await recordRevision(tx, existing, "baseline");
      const updated = await tx.post.update({
        where: { slug },
        data: {
          ...fields,
          revision: { increment: 1 },
          ...(fields.published === true && !existing.publishedAt
            ? { publishedAt: new Date() }
            : {}),
          cover: data.cover === null ? null : textField(data.cover, 512),
          categoryId,
          ...(await seriesFields(data, existing, tx)),
          tags,
        },
        include: relations,
      });
      await recordRevision(tx, updated, actor);
      return updated;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 15000,
    },
  );
  return json({ ok: true, data: format(result) });
});
export const DELETE = endpoint(async (req: Request, ctx: Context) => {
  await admin(req);
  const { slug } = await ctx.params;
  await prisma.$transaction(async (tx) => {
    await lockedPost(tx, slug);
    await tx.postTag.deleteMany({ where: { post: { slug } } });
    await tx.post.delete({ where: { slug } });
  });
  return json({ ok: true });
});
