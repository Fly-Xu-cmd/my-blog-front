import PublicList from '@/components/PublicList';
import { listContent } from '@/lib/content';
import { serialize } from '@/lib/public-content';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export const metadata = { title: '笔记', alternates: { canonical: '/notes' } };
export default async function Page() {
  const initial = await listContent('note', new URLSearchParams());
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      where: {
        OR: [{ posts: { some: { published: true } } }, { notes: { some: { published: true } } }],
      },
      select: { name: true },
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
  return (
    <section className="w-full">
      <h1 className="text-center text-3xl font-bold pt-10">笔记</h1>
      <PublicList
        resource="note"
        initial={serialize(initial)}
        categories={categories.map((c) => c.name)}
        tags={tags.map((t) => t.name)}
      />
    </section>
  );
}
