import { prisma } from '@/lib/prisma';
import { admin, ApiError, body, endpoint, idField, json } from '@/lib/api';
export const POST = endpoint(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await admin(req);
  const id = idField(Number((await ctx.params).id));
  if (!id) throw new ApiError(400, 'INVALID_ID');
  const data = await body(req);
  if (!Array.isArray(data.postIds)) throw new ApiError(400, 'INVALID_ORDER');
  const ids = data.postIds.map((v) => idField(v));
  if (ids.some((v) => !v) || new Set(ids).size !== ids.length)
    throw new ApiError(400, 'INVALID_ORDER');
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { id: number }[]
    >`SELECT id FROM Series WHERE id = ${id} FOR UPDATE`;
    if (!rows.length) throw new ApiError(404, 'NOT_FOUND');
    const posts = await tx.post.findMany({ where: { seriesId: id }, select: { id: true } });
    if (posts.length !== ids.length || posts.some((p) => !ids.includes(p.id)))
      throw new ApiError(409, 'SERIES_CHANGED');
    await tx.post.updateMany({ where: { seriesId: id }, data: { seriesOrder: null } });
    for (let i = 0; i < ids.length; i++)
      await tx.post.update({ where: { id: ids[i]! }, data: { seriesOrder: i + 1 } });
  });
  return json({ ok: true });
});
