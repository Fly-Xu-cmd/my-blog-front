import { prisma } from "@/lib/prisma";
import {
  admin,
  adminScope,
  body,
  ApiError,
  endpoint,
  json,
  textField,
} from "@/lib/api";
export const GET = endpoint(async (req: Request) => {
  const isAdmin = await adminScope(req);
  const data = await prisma.tag.findMany({
    where: isAdmin
      ? {}
      : {
          OR: [
            { posts: { some: { post: { published: true } } } },
            { notes: { some: { note: { published: true } } } },
          ],
        },
    orderBy: { name: "asc" },
  });
  return json({ ok: true, data, total: data.length });
});
export const POST = endpoint(async (req: Request) => {
  await admin(req);
  const data = await body(req);
  const name = textField(data.name, 100, true)!;
  return json({
    ok: true,
    data: await prisma.tag.upsert({
      where: { name },
      create: { name },
      update: {},
    }),
  });
});
export const PUT = endpoint(async (req: Request) => {
  await admin(req);
  const data = await body(req);
  return json({
    ok: true,
    data: await prisma.$transaction(async (tx) => {
      const tag = await tx.tag.update({
        where: { name: textField(data.name, 100, true)! },
        data: { name: textField(data.newName, 100, true)! },
      });
      await tx.post.updateMany({
        where: { tags: { some: { tagId: tag.id } } },
        data: { revision: { increment: 1 } },
      });
      return tag;
    }),
  });
});
export const DELETE = endpoint(async (req: Request) => {
  await admin(req);
  const data = await body(req);
  const name = textField(data.name, 100, true)!;
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { id: number }[]
    >`SELECT id FROM Tag WHERE name = ${name} FOR UPDATE`;
    if (!rows.length) throw new ApiError(404, "NOT_FOUND");
    const id = rows[0].id;
    await tx.post.updateMany({
      where: { tags: { some: { tagId: id } } },
      data: { revision: { increment: 1 } },
    });
    await tx.postTag.deleteMany({ where: { tagId: id } });
    await tx.noteTag.deleteMany({ where: { tagId: id } });
    await tx.tag.delete({ where: { id } });
  });
  return json({ ok: true });
});
