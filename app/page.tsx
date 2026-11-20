import HomeFeed from "./HomeFeed";
import ReadingEntry from '@/components/ReadingEntry';
import { listContent } from "@/lib/content";
import { serialize } from "@/lib/public-content";
import { siteForPage } from "@/lib/site-settings";
export const dynamic = "force-dynamic";
const empty = { data: [], total: 0, current: 1, pageSize: 10, pages: 0 };
export default async function Home() {
  const [posts, notes, dynamics] = await Promise.allSettled([
    listContent("post", new URLSearchParams({ pageSize: "4" })),
    listContent("note", new URLSearchParams({ pageSize: "3" })),
    listContent("dynamic", new URLSearchParams({ pageSize: "2" })),
  ]);
  return (
    <HomeFeed
      site={await siteForPage()}
      readingEntry={<ReadingEntry />}
      posts={posts.status === "fulfilled" ? serialize(posts.value) : empty}
      notes={notes.status === "fulfilled" ? serialize(notes.value) : empty}
      dynamics={
        dynamics.status === "fulfilled" ? serialize(dynamics.value) : empty
      }
      postError={posts.status === "rejected"}
      noteError={notes.status === "rejected"}
      dynamicError={dynamics.status === "rejected"}
    />
  );
}
