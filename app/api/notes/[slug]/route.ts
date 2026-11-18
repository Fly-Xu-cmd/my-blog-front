import { prisma } from '@/lib/prisma';
import { admin, adminScope, ApiError, body, booleanField, endpoint, json } from '@/lib/api';
import { detail, format } from '@/lib/content';
type Context = { params: Promise<{ slug: string }> };
export const GET = endpoint(async (req: Request, ctx: Context) =>
  json({ ok: true, data: await detail('note', (await ctx.params).slug, await adminScope(req)) }),
);
export const PUT = endpoint(async (req: Request, ctx: Context) => {
  await admin(req);
  const { slug } = await ctx.params;
  const data = await body(req);
  if (Object.keys(data).some((k) => !['published', 'kind', 'method'].includes(k)))
    throw new ApiError(400, 'NOTE_LOCAL_CONTENT_ONLY', '请在本地编辑笔记正文、分类和标签后同步');
  const published = booleanField(data.published);
  if (data.kind !== undefined && data.kind !== 'TECH' && data.kind !== 'ESSAY')
    throw new ApiError(400, 'INVALID_KIND');
  const result = await prisma.$transaction(async (tx) => {
    if (published === true)
      await tx.note.updateMany({
        where: { slug, publishedAt: null },
        data: { publishedAt: new Date() },
      });
    return tx.note.update({
      where: { slug },
      data: { published, kind: data.kind as 'TECH' | 'ESSAY' | undefined },
      include: { category: true, tags: { include: { tag: true } } },
    });
  });
  return json({ ok: true, data: format(result) });
});
export const DELETE = endpoint(async (req: Request, ctx: Context) => {
  await admin(req);
  await prisma.note.delete({ where: { slug: (await ctx.params).slug } });
  return json({ ok: true });
});
