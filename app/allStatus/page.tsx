import PublicList from '@/components/PublicList';
import { listContent } from '@/lib/content';
import { serialize } from '@/lib/public-content';
export const dynamic = 'force-dynamic';
export const metadata = { title: '全部动态', alternates: { canonical: '/allStatus' } };
export default async function Page() {
  const initial = await listContent('dynamic', new URLSearchParams());
  return (
    <section className="w-full">
      <h1 className="text-center text-3xl font-bold pt-10">全部动态</h1>
      <PublicList resource="dynamic" initial={serialize(initial)} categories={[]} tags={[]} />
    </section>
  );
}
