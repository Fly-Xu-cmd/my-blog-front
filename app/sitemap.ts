import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { absoluteUrl } from '@/lib/seo';

// 运行时生成（CI 构建环境无数据库连接）
export const dynamic = 'force-dynamic';

/**
 * 生成站点地图 /sitemap.xml
 * 包含静态页面 + 已发布博客 + 已发布笔记（动态内容短、SEO 价值低，不收录）
 * @returns sitemap 条目数组
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 静态页面
  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/allBlogs'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/notes'), changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/allStatus'), changeFrequency: 'daily', priority: 0.6 },
    { url: absoluteUrl('/archive'), changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/subscribe'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.5 },
  ];

  // 数据库不可达时仅返回静态页面，保证 sitemap 可用
  try {
    const [posts, notes, series, tags] = await Promise.all([
      prisma.post.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.note.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.series.findMany({
        where: { posts: { some: { published: true } } },
        select: { slug: true, updatedAt: true },
      }),
      prisma.tag.findMany({
        where: {
          OR: [
            { posts: { some: { post: { published: true } } } },
            { notes: { some: { note: { published: true } } } },
          ],
        },
        select: { name: true },
      }),
    ]);

    return [
      ...staticEntries,
      ...series.map((s) => ({ url: absoluteUrl('/series/' + s.slug), lastModified: s.updatedAt })),
      ...tags.map((t) => ({ url: absoluteUrl('/tags/' + encodeURIComponent(t.name)) })),
      ...posts.map((p) => ({
        url: absoluteUrl(`/posts/${p.slug}`),
        lastModified: p.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      ...notes.map((n) => ({
        url: absoluteUrl(`/notes/${n.slug}`),
        lastModified: n.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticEntries;
  }
}
