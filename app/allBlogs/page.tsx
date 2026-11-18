import PublicList from '@/components/PublicList';
import { listContent } from '@/lib/content';
import { serialize } from '@/lib/public-content';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: '全部博客',
  alternates: { canonical: '/allBlogs' },
};
export default async function Page() {
  const initial = await listContent('post', new URLSearchParams());
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      where: { posts: { some: { published: true } } },
      select: { name: true },
    }),
    prisma.tag.findMany({
      where: { posts: { some: { post: { published: true } } } },
      select: { name: true },
    }),
  ]);
  return (
    <main className="editorial-page">
      <PublicList
        resource="post"
        heading="博客"
        description="前后端开发、AI 应用，以及值得展开聊聊的事。"
        featured
        initial={serialize(initial)}
        categories={categories.map((c) => c.name)}
        tags={tags.map((t) => t.name)}
      />
    </main>
  );
}
