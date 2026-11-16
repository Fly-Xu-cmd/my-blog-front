import { prisma } from '@/lib/prisma';
import { admin, adminScope, ApiError, body, endpoint, json, textField } from '@/lib/api';
import {
  categoryField,
  contentFields,
  detail,
  format,
  relations,
  seriesFields,
  tagWrite,
} from '@/lib/content';
type Context = { params: Promise<{ slug: string }> };
export const GET = endpoint(async (req: Request, ctx: Context) =>
  json({ ok: true, data: await detail('post', (await ctx.params).slug, await adminScope(req)) }),
);
export const PUT = endpoint(async (req: Request, ctx: Context) => {
  await admin(req);
  const { slug } = await ctx.params;
  const data = await body(req);
  if (data.slug !== undefined && data.slug !== slug) throw new ApiError(409, 'SLUG_IMMUTABLE');
  const fields = contentFields(data);
  if (fields.title !== undefined) textField(fields.title, 255, true);
  if (fields.content !== undefined) textField(fields.content, 4_000_000, true);
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.post.findUnique({ where: { slug } });
    if (!existing) throw new ApiError(404, 'NOT_FOUND');
    if (fields.published === true)
      await tx.post.updateMany({
        where: { slug, publishedAt: null },
        data: { publishedAt: new Date() },
      });
    return tx.post.update({
      where: { slug },
      data: {
        ...fields,
        cover: data.cover === null ? null : textField(data.cover, 512),
        categoryId: await categoryField(data.categoryId, tx),
        ...(await seriesFields(data, existing, tx)),
        tags:
          data.tags === undefined
            ? undefined
            : { deleteMany: {}, ...(await tagWrite(data.tags, tx)) },
      },
      include: relations,
    });
  });
  return json({ ok: true, data: format(result) });
});
export const DELETE = endpoint(async (req: Request, ctx: Context) => {
  await admin(req);
  const { slug } = await ctx.params;
  await prisma.$transaction(async (tx) => {
    await tx.postTag.deleteMany({ where: { post: { slug } } });
    await tx.post.delete({ where: { slug } });
  });
  return json({ ok: true });
});
