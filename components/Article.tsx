import Link from "next/link";
import Markdown from "./Markdown";
import ReadingTools from "./ReadingTools";
import ReadingMemory from "./ReadingMemory";
import ArticleConversation from "./ArticleConversation";
import { markdownHeadings, shanghaiDate } from "@/lib/markdown";
import { prisma } from "@/lib/prisma";
import { createHash } from "node:crypto";
import SearchArrival from "./SearchArrival";
type ArticleData = {
  id: number;
  title: string | null;
  content: string;
  publishedAt: Date | null;
  createdAt: Date;
  tags?: string[];
  category?: { name: string } | null;
  seriesId?: number | null;
  seriesOrder?: number | null;
  cover?: string | null;
};
export default async function Article({
  data,
  url,
  resource,
}: {
  data: ArticleData;
  url: string;
  resource: "post" | "note" | "dynamic";
}) {
  const headings = markdownHeadings(data.content);
  const series = data.seriesId
    ? await prisma.series.findUnique({
        where: { id: data.seriesId },
        include: {
          posts: {
            where: { published: true },
            select: { id: true, slug: true, title: true, seriesOrder: true },
            orderBy: [{ seriesOrder: "asc" }, { id: "asc" }],
          },
        },
      })
    : null;
  const position = series?.posts.findIndex((p) => p.id === data.id) ?? -1;
  const previous = series && position > 0 ? series.posts[position - 1] : null;
  const next = series && position >= 0 ? series.posts[position + 1] : null;
  const related =
    resource === "post"
      ? await prisma.post.findMany({
          where: {
            published: true,
            id: {
              notIn: [
                data.id,
                ...(previous ? [previous.id] : []),
                ...(next ? [next.id] : []),
              ],
            },
            ...(data.category
              ? { category: { name: data.category.name } }
              : {}),
          },
          select: { slug: true, title: true },
          orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
          take: 2,
        })
      : [];
  return (
    <div
      className={
        "mx-auto w-full px-4 py-10 grid gap-8 " +
        (headings.length
          ? "max-w-6xl lg:grid-cols-[minmax(0,1fr)_240px]"
          : "max-w-[860px] article-without-toc")
      }
    >
      <article
        id="article"
        className="min-w-0 p-6 sm:p-10 rounded-2xl bg-white border border-gray-100 dark:bg-white/[0.04] dark:border-white/10"
      >
        <header className="border-b border-gray-100 dark:border-white/10 pb-6 mb-8">
          <h1 className="text-3xl font-bold mb-4">{data.title || "动态"}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <time>{shanghaiDate(data.publishedAt ?? data.createdAt)}</time>
            {data.category?.name}
            <ReadingTools path={url} />
          </div>
          {resource !== "dynamic" && (
            <ReadingMemory
              kind={resource}
              id={data.id}
              version={createHash("sha256")
                .update(data.content)
                .digest("hex")
                .slice(0, 16)}
            />
          )}
          <div className="flex gap-3 mt-4 flex-wrap">
            {data.tags?.map((tag) => (
              <Link
                className="text-cyan-600"
                href={"/tags/" + encodeURIComponent(tag)}
                key={tag}
              >
                #{tag}
              </Link>
            ))}
          </div>
        </header>
        <Markdown source={data.content} />
        <SearchArrival />
        {resource !== "dynamic" && (
          <ArticleConversation
            resource={resource}
            contentId={data.id}
            title={data.title || "笔记"}
            path={url}
            cover={data.cover}
          />
        )}
        {((series && position >= 0) || related.length > 0) && (
          <footer className="article-reading-footer mt-7 border-t border-gray-200 dark:border-white/10 pt-4 space-y-3">
            {series && position >= 0 && (
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <Link
                  className="min-w-0 max-w-full text-sm text-gray-500 dark:text-gray-400 [overflow-wrap:anywhere] hover:text-cyan-600 dark:hover:text-cyan-400"
                  href={"/series/" + series.slug}
                >
                  <span className="underline decoration-gray-400/60 underline-offset-4">
                    {series.name}
                  </span>{" "}
                  <span className="whitespace-nowrap text-xs">
                    · {position + 1}/{series.posts.length}
                  </span>
                </Link>
                {(previous || next) && (
                  <nav
                    aria-label="系列上下篇"
                    className="min-w-0 basis-full sm:basis-auto sm:flex-1 flex flex-wrap justify-end gap-x-5 gap-y-2 text-sm"
                  >
                    {previous && (
                      <Link
                        className="min-w-0 max-w-full flex items-baseline gap-2 hover:text-cyan-600 dark:hover:text-cyan-400"
                        href={"/posts/" + previous.slug}
                      >
                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                          上一篇
                        </span>
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                          {previous.title}
                        </span>
                      </Link>
                    )}
                    {next && (
                      <Link
                        className="min-w-0 max-w-full flex items-baseline justify-end gap-2 text-right hover:text-cyan-600 dark:hover:text-cyan-400"
                        href={"/posts/" + next.slug}
                      >
                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                          下一篇
                        </span>
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                          {next.title} <span aria-hidden="true">→</span>
                        </span>
                      </Link>
                    )}
                  </nav>
                )}
              </div>
            )}
            {related.length > 0 && (
              <nav
                aria-label="推荐阅读"
                className="flex items-baseline gap-3 text-sm text-gray-500 dark:text-gray-400"
              >
                <span className="shrink-0 text-xs">另读</span>
                <ul className="min-w-0 flex flex-wrap gap-x-5 gap-y-1">
                  {related.map((p) => (
                    <li
                      className="min-w-0 max-w-full [overflow-wrap:anywhere]"
                      key={p.slug}
                    >
                      <Link
                        className="hover:text-cyan-600 dark:hover:text-cyan-400"
                        href={"/posts/" + p.slug}
                      >
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </footer>
        )}
      </article>
      {!!headings.length && (
        <aside className="lg:sticky lg:top-28 h-fit">
          <h2 className="font-bold mb-4">文章目录</h2>
          <nav className="space-y-3">
            {headings.map((h) => (
              <a
                className="block text-sm text-gray-500 hover:text-cyan-600"
                key={h.id}
                href={"#" + h.id}
                style={{ paddingLeft: (h.level - 1) * 10 }}
              >
                {h.title}
              </a>
            ))}
          </nav>
        </aside>
      )}
    </div>
  );
}
