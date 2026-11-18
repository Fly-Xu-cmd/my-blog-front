import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";

export interface FeedEntry {
  title: string;
  excerpt: string | null;
  publishedAt: Date | null;
  path: string;
  url: string;
  kind: "post" | "note";
}

/** The XML feed and its human-facing preview share the same public entries. */
export async function readFeedEntries(): Promise<FeedEntry[]> {
  const query = {
    where: { published: true },
    select: { slug: true, title: true, excerpt: true, publishedAt: true },
    orderBy: [{ publishedAt: "desc" as const }, { id: "desc" as const }],
    take: 50,
  };
  const [posts, notes] = await Promise.all([
    prisma.post.findMany(query),
    prisma.note.findMany(query),
  ]);
  return [
    ...posts.map((p) => ({
      ...p,
      kind: "post" as const,
      path: "/posts/" + p.slug,
    })),
    ...notes.map((p) => ({
      ...p,
      kind: "note" as const,
      path: "/notes/" + p.slug,
    })),
  ]
    .map((p) => ({ ...p, url: absoluteUrl(p.path) }))
    .sort(
      (a, b) =>
        +(b.publishedAt ?? 0) - +(a.publishedAt ?? 0) ||
        a.url.localeCompare(b.url),
    )
    .slice(0, 50);
}
