import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";

// 运行时生成（CI 构建环境无数据库连接）
export const dynamic = "force-dynamic";

/**
 * 生成站点地图 /sitemap.xml
 * 包含静态页面 + 已发布博客 + 已发布笔记（动态内容短、SEO 价值低，不收录）
 * @returns sitemap 条目数组
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 静态页面
  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/frontend/allBlogs"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/frontend/notes"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/frontend/allStatus"), changeFrequency: "daily", priority: 0.6 },
    { url: absoluteUrl("/frontend/about"), changeFrequency: "monthly", priority: 0.5 },
  ];

  // 数据库不可达时仅返回静态页面，保证 sitemap 可用
  try {
    const [posts, notes] = await Promise.all([
      prisma.post.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.note.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return [
      ...staticEntries,
      ...posts.map((p) => ({
        url: absoluteUrl(`/frontend/posts/${p.slug}`),
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...notes.map((n) => ({
        url: absoluteUrl(`/frontend/notes/${n.slug}`),
        lastModified: n.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticEntries;
  }
}
