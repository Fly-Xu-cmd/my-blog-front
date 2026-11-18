import { prisma } from '@/lib/prisma';
import { admin, adminScope, ApiError, body, endpoint, idField, json, textField } from '@/lib/api';
import { createWithSlug } from '@/lib/slug';
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
  const name = textField(data.name, 100, true)!;
  const description = textField(data.description, 65535);
  return json({
    ok: true,
    data: await createWithSlug(name, 'series', data.slug, (slug) =>
      prisma.series.create({ data: { slug, name, description } }),
    ),
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
