import { prisma } from '@/lib/prisma';
import { listContent } from '@/lib/content';
import { serialize } from '@/lib/public-content';
import PublicList from '@/components/PublicList';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const visible = await prisma.tag.findFirst({
    where: {
      name: tag,
      OR: [
        { posts: { some: { post: { published: true } } } },
        { notes: { some: { note: { published: true } } } },
      ],
    },
  });
  if (!visible) notFound();
  const p = new URLSearchParams({ tags: tag });
  const [posts, notes] = await Promise.all([listContent('post', p), listContent('note', p)]);
  return (
    <main className="editorial-page">
      <div className="editorial-page-heading">
        <h1>#{tag}</h1>
        <p>围绕这个标签的公开文章与笔记。</p>
      </div>
      <div className="editorial-section-head">
        <h2>博客</h2>
      </div>
      <PublicList resource="post" initial={serialize(posts)} fixedTag={tag} />
      <div className="editorial-section-head editorial-home-section">
        <h2>笔记</h2>
      </div>
      <PublicList resource="note" initial={serialize(notes)} fixedTag={tag} />
    </main>
  );
}
