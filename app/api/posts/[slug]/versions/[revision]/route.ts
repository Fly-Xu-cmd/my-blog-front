import { admin, ApiError, endpoint, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { historyPost } from "@/lib/post-revisions";
type Context = { params: Promise<{ slug: string; revision: string }> };
export const GET = endpoint(async (req: Request, ctx: Context) => {
  await admin(req);
  const { slug, revision } = await ctx.params;
  if (!/^[1-9]\d*$/.test(revision) || Number(revision) >= 2147483647)
    throw new ApiError(400, "INVALID_REVISION");
  const postId = await historyPost(slug);
  const data = await prisma.postRevision.findUnique({
    where: { postId_revision: { postId, revision: Number(revision) } },
  });
  if (!data) throw new ApiError(404, "NOT_FOUND");
  return json({ ok: true, data });
});
