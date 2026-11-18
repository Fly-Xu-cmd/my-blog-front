import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { shanghaiDate } from '@/lib/markdown';
import Link from 'next/link';
export const dynamic = 'force-dynamic';
export const metadata = { title: '文章归档', alternates: { canonical: '/archive' } };
export default async function Archive({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const raw = (await searchParams).page;
  const page = Number(raw ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) notFound();
  const [posts, notes] = await Promise.all([
    prisma.post.findMany({
      where: { published: true },
      select: { slug: true, title: true, publishedAt: true },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: page * 50 + 1,
    }),
    prisma.note.findMany({
      where: { published: true },
      select: { slug: true, title: true, publishedAt: true },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: page * 50 + 1,
    }),
  ]);
  const all = [
    ...posts.map((p) => ({ ...p, url: '/posts/' + p.slug })),
    ...notes.map((p) => ({ ...p, url: '/notes/' + p.slug })),
  ].sort((a, b) => +(b.publishedAt ?? 0) - +(a.publishedAt ?? 0) || a.url.localeCompare(b.url));
  const rows = all.slice((page - 1) * 50, page * 50);
  return (
    <section className="max-w-4xl mx-auto w-full p-8">
      <h1 className="text-3xl font-bold mb-8">文章归档</h1>
      <ul className="space-y-5">
        {rows.map((p) => (
          <li key={p.url}>
            <time className="text-gray-500 mr-5">{shanghaiDate(p.publishedAt)}</time>
            <Link href={p.url}>{p.title}</Link>
          </li>
        ))}
      </ul>
      <nav className="flex gap-6 mt-8">
        {page > 1 && <Link href={'?page=' + (page - 1)}>上一页</Link>}
        {all.length > page * 50 && <Link href={'?page=' + (page + 1)}>下一页</Link>}
      </nav>
    </section>
  );
}
