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
    <section className="w-full">
      <h1 className="text-3xl font-bold text-center pt-10">#{tag}</h1>
      <PublicList resource="post" initial={serialize(posts)} fixedTag={tag} />
      <PublicList resource="note" initial={serialize(notes)} fixedTag={tag} />
    </section>
  );
}
