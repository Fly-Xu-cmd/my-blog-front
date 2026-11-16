import HomeFeed from './HomeFeed';
import { listContent } from '@/lib/content';
import { serialize } from '@/lib/public-content';
export const dynamic = 'force-dynamic';
const empty = { data: [], total: 0, current: 1, pageSize: 10, pages: 0 };
export default async function Home() {
  const [posts, dynamics] = await Promise.allSettled([
    listContent('post', new URLSearchParams()),
    listContent('dynamic', new URLSearchParams()),
  ]);
  return (
    <HomeFeed
      posts={posts.status === 'fulfilled' ? serialize(posts.value) : empty}
      dynamics={dynamics.status === 'fulfilled' ? serialize(dynamics.value) : empty}
      postError={posts.status === 'rejected'}
      dynamicError={dynamics.status === 'rejected'}
    />
  );
}
