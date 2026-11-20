import { Prisma } from "@prisma/client";
import { ApiError } from "./api";
import { relations } from "./content";
import { prisma } from "./prisma";

type Post = Prisma.PostGetPayload<{ include: typeof relations }>;
export function expectedRevision(value: unknown) {
  if (value === undefined) return undefined; // Compatible API rollout before admin upgrade.
  if (
    !Number.isInteger(value) ||
    Number(value) < 1 ||
    Number(value) >= 2147483647
  )
    throw new ApiError(400, "INVALID_REVISION");
  return Number(value);
}
export async function lockedPost(
  tx: Prisma.TransactionClient,
  slug: string,
  revision?: number,
) {
  await tx.$queryRaw`SELECT id FROM Post WHERE slug = ${slug} FOR UPDATE`;
  const row = await tx.post.findUnique({ where: { slug }, include: relations });
  if (!row) throw new ApiError(404, "NOT_FOUND");
  if (revision !== undefined && row.revision !== revision)
    throw new ApiError(
      409,
      "POST_VERSION_CONFLICT",
      "文章已在其他窗口更新，当前输入已保留，请重新载入最新版本",
    );
  return row;
}
export async function recordRevision(
  tx: Prisma.TransactionClient,
  post: Post,
  actor: string,
) {
  const snapshot = {
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    cover: post.cover,
  };
  // Restoring prose must not restore old publication, URL or taxonomy/series settings.
  await tx.postRevision.upsert({
    where: { postId_revision: { postId: post.id, revision: post.revision } },
    create: { postId: post.id, revision: post.revision, snapshot, actor },
    update: {},
  });
}
export async function historyPost(slug: string) {
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!post) throw new ApiError(404, "NOT_FOUND");
  return post.id;
}
