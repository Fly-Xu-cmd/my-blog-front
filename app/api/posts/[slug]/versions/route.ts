import { admin, endpoint, json, pagination } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { historyPost } from "@/lib/post-revisions";
type Context = { params: Promise<{ slug: string }> };
export const GET = endpoint(async (req: Request, ctx: Context) => {
  await admin(req);
  const postId = await historyPost((await ctx.params).slug);
  const { current, pageSize, skip, take } = pagination(
    new URL(req.url).searchParams,
  );
  const [total, data] = await prisma.$transaction([
    prisma.postRevision.count({ where: { postId } }),
    prisma.postRevision.findMany({
      where: { postId },
      select: { revision: true, actor: true, createdAt: true },
      orderBy: { revision: "desc" },
      skip,
      take,
    }),
  ]);
  return json({
    ok: true,
    data,
    total,
    current,
    pageSize,
    pages: Math.ceil(total / pageSize),
  });
});
