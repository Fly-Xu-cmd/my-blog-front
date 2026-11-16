import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { shanghaiDate } from '@/lib/markdown';
export const dynamic = 'force-dynamic';
export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const series = await prisma.series.findUnique({
    where: { slug },
    include: {
      posts: {
        where: { published: true },
        orderBy: [{ seriesOrder: 'asc' }, { id: 'asc' }],
        select: { slug: true, title: true, publishedAt: true },
      },
    },
  });
  if (!series || !series.posts.length) notFound();
  return (
    <section className="max-w-4xl mx-auto w-full p-8">
      <h1 className="text-3xl font-bold mb-5">{series.name}</h1>
      <p className="text-gray-500 mb-8">
        {series.description} · 已公开 {series.posts.length} 篇
      </p>
      <ol className="space-y-5">
        {series.posts.map((p, i) => (
          <li key={p.slug}>
            <Link href={'/posts/' + p.slug}>
              {i + 1}. {p.title}
            </Link>
            <time className="block text-sm text-gray-500">{shanghaiDate(p.publishedAt)}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}
