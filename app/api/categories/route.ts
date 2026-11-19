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
  const data = await prisma.category.findMany({
    where: isAdmin
      ? {}
      : {
          OR: [
            { posts: { some: { published: true } } },
            { notes: { some: { published: true } } },
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
    data: await prisma.category.upsert({
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
    data: await prisma.category.update({
      where: { name: textField(data.name, 100, true)! },
      data: { name: textField(data.newName, 100, true)! },
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
    >`SELECT id FROM Category WHERE name = ${name} FOR UPDATE`;
    if (!rows.length) throw new ApiError(404, "NOT_FOUND");
    const id = rows[0].id;
    await tx.post.updateMany({
      where: { categoryId: id },
      data: { categoryId: null, revision: { increment: 1 } },
    });
    await tx.note.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    await tx.category.delete({ where: { id } });
  });
  return json({ ok: true });
});
