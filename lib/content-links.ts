import { prisma } from "./prisma";
import { absoluteUrl } from "./seo";
export async function contentLinks(paths: string[]) {
  const postSlugs = paths
    .filter((p) => p.startsWith("/posts/"))
    .map((p) => p.slice(7));
  const noteSlugs = paths
    .filter((p) => p.startsWith("/notes/"))
    .map((p) => p.slice(7));
  const [posts, notes] = await Promise.all([
    prisma.post.findMany({
      where: { slug: { in: postSlugs } },
      select: { slug: true, title: true, published: true },
    }),
    prisma.note.findMany({
      where: { slug: { in: noteSlugs } },
      select: { slug: true, title: true, published: true, kind: true },
    }),
  ]);
  const names: Record<string, string> = {
    "/": "首页",
    "/allBlogs": "文章列表",
    "/notes": "笔记列表",
    "/allStatus": "动态列表",
    "/archive": "归档",
    "/subscribe": "订阅",
    "/about": "关于我",
  };
  return new Map(
    paths.map((path) => {
      const row = path.startsWith("/posts/")
        ? posts.find((p) => p.slug === path.slice(7))
        : notes.find((p) => p.slug === path.slice(7));
      const unavailable =
        (path.startsWith("/posts/") || path.startsWith("/notes/")) &&
        (!row || !row.published);
      return [
        path,
        {
          title: row?.title ?? names[path] ?? path,
          kind: row
            ? path.startsWith("/posts/")
              ? "文章"
              : "kind" in row && row.kind === "ESSAY"
                ? "随笔"
                : "技术笔记"
            : "页面",
          url: unavailable ? null : absoluteUrl(path),
        },
      ];
    }),
  );
}
