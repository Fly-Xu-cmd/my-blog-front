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
      where: { notes: { some: { published: true } } },
      select: { name: true },
    }),
    prisma.tag.findMany({
      where: { notes: { some: { note: { published: true } } } },
      select: { name: true },
    }),
  ]);
  return (
    <main className="editorial-page">
      <PublicList
        resource="note"
        heading="笔记"
        description="把零散的发现记下来，留给下一次需要它的自己。"
        initial={serialize(initial)}
        categories={categories.map((c) => c.name)}
        tags={tags.map((t) => t.name)}
      />
    </main>
  );
}
