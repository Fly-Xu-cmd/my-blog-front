import { prisma } from '@/lib/prisma';
import { admin, adminScope, ApiError, body, endpoint, idField, json, textField } from '@/lib/api';
import { manualSlug } from '@/lib/slug';
export const GET = endpoint(async (req: Request) => {
  const isAdmin = await adminScope(req);
  return json({
    ok: true,
    data: await prisma.series.findMany({
      where: isAdmin ? {} : { posts: { some: { published: true } } },
      orderBy: { name: 'asc' },
    }),
  });
});
export const POST = endpoint(async (req: Request) => {
  await admin(req);
  const data = await body(req);
  const slug = manualSlug(data.slug);
  if (!slug) throw new ApiError(400, 'SLUG_REQUIRED');
  return json({
    ok: true,
    data: await prisma.series.create({
      data: {
        slug,
        name: textField(data.name, 100, true)!,
        description: textField(data.description, 65535),
      },
    }),
  });
});
export const PUT = endpoint(async (req: Request) => {
  await admin(req);
  const data = await body(req);
  const id = idField(data.id);
  if (!id) throw new ApiError(400, 'INVALID_ID');
  if (data.slug !== undefined) throw new ApiError(409, 'SLUG_IMMUTABLE');
  return json({
    ok: true,
    data: await prisma.series.update({
      where: { id },
      data: {
        name: textField(data.name, 100),
        description: data.description === null ? null : textField(data.description, 65535),
      },
    }),
  });
});
export const DELETE = endpoint(async (req: Request) => {
  await admin(req);
  const data = await body(req);
  const id = idField(data.id);
  if (!id) throw new ApiError(400, 'INVALID_ID');
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM Series WHERE id = ${id} FOR UPDATE`;
    await tx.post.updateMany({
      where: { seriesId: id },
      data: { seriesId: null, seriesOrder: null },
    });
    await tx.series.delete({ where: { id } });
  });
  return json({ ok: true });
});
