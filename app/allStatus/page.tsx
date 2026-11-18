import PublicList from '@/components/PublicList';
import { listContent } from '@/lib/content';
import { serialize } from '@/lib/public-content';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: '全部动态',
  alternates: { canonical: '/allStatus' },
};
export default async function Page() {
  const initial = await listContent('dynamic', new URLSearchParams());
  return (
    <main className="editorial-page">
      <PublicList
        resource="dynamic"
        heading="动态"
        description="一些近况，一点想法，不一定需要写成一篇文章。"
        initial={serialize(initial)}
      />
    </main>
  );
}
