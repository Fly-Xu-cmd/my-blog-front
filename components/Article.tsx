import Link from 'next/link';
import Markdown from './Markdown';
import ReadingTools from './ReadingTools';
import { markdownHeadings, shanghaiDate } from '@/lib/markdown';
import { prisma } from '@/lib/prisma';
type ArticleData = {
  id: number;
  title: string | null;
  content: string;
  publishedAt: Date | null;
  createdAt: Date;
  tags?: string[];
  category?: { name: string } | null;
  seriesId?: number | null;
  seriesOrder?: number | null;
};
export default async function Article({
  data,
  url,
  resource,
}: {
  data: ArticleData;
  url: string;
  resource: 'post' | 'note' | 'dynamic';
}) {
  const headings = markdownHeadings(data.content);
  const related =
    resource === 'post'
      ? await prisma.post.findMany({
          where: {
            published: true,
            id: { not: data.id },
            ...(data.category ? { category: { name: data.category.name } } : {}),
          },
          select: { slug: true, title: true },
          orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
          take: 3,
        })
      : [];
  const series = data.seriesId
    ? await prisma.series.findUnique({
        where: { id: data.seriesId },
        include: {
          posts: {
            where: { published: true },
            select: { id: true, slug: true, title: true, seriesOrder: true },
            orderBy: [{ seriesOrder: 'asc' }, { id: 'asc' }],
          },
        },
      })
    : null;
  const position = series?.posts.findIndex((p) => p.id === data.id) ?? -1;
  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-10 grid lg:grid-cols-[minmax(0,1fr)_240px] gap-8">
      <article
        id="article"
        className="min-w-0 p-6 sm:p-10 rounded-2xl bg-white border border-gray-100 dark:bg-white/[0.04] dark:border-white/10"
      >
        <header className="border-b border-gray-100 dark:border-white/10 pb-6 mb-8">
          <h1 className="text-3xl font-bold mb-4">{data.title || '动态'}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <time>{shanghaiDate(data.publishedAt ?? data.createdAt)}</time>
            {data.category?.name}
            <ReadingTools path={url} />
          </div>
          <div className="flex gap-3 mt-4 flex-wrap">
            {data.tags?.map((tag) => (
              <Link className="text-cyan-600" href={'/tags/' + encodeURIComponent(tag)} key={tag}>
                #{tag}
              </Link>
            ))}
          </div>
        </header>
        <Markdown source={data.content} />
        {series && (
          <nav className="mt-10 border-t pt-6 flex flex-wrap justify-between gap-4">
            <Link href={'/series/' + series.slug}>
              {series.name} · 第 {position + 1}/{series.posts.length} 篇
            </Link>
            {position > 0 && (
              <Link href={'/posts/' + series.posts[position - 1].slug}>
                上一篇：{series.posts[position - 1].title}
              </Link>
            )}
            {position >= 0 && position < series.posts.length - 1 && (
              <Link href={'/posts/' + series.posts[position + 1].slug}>
                下一篇：{series.posts[position + 1].title}
              </Link>
            )}
          </nav>
        )}
        {related.length > 0 && (
          <section className="mt-10 border-t pt-6">
            <h2 className="font-bold mb-4">继续阅读</h2>
            <ul className="space-y-3">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link className="text-cyan-600" href={'/posts/' + p.slug}>
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
      <aside className="lg:sticky lg:top-28 h-fit">
        <h2 className="font-bold mb-4">文章目录</h2>
        <nav className="space-y-3">
          {headings.map((h) => (
            <a
              className="block text-sm text-gray-500 hover:text-cyan-600"
              key={h.id}
              href={'#' + h.id}
              style={{ paddingLeft: (h.level - 1) * 10 }}
            >
              {h.title}
            </a>
          ))}
        </nav>
      </aside>
    </div>
  );
}
