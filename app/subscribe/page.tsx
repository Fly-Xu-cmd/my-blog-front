import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Rss } from "lucide-react";
import { absoluteUrl } from "@/lib/seo";
import { readFeedEntries, type FeedEntry } from "@/lib/feed";
import { shanghaiDate } from "@/lib/markdown";
import SubscriptionTools from "./SubscriptionTools";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "RSS 订阅",
  description: "用 RSS 订阅若木的小世界，在你习惯的阅读器里收到新文章和笔记。",
  alternates: { canonical: "/subscribe" },
};

export default async function Subscribe() {
  let entries: FeedEntry[] = [];
  let unavailable = false;
  try {
    entries = (await readFeedEntries()).slice(0, 5);
  } catch {
    unavailable = true;
  }
  return (
    <main className="editorial-page subscription-page">
      <header className="subscription-intro">
        <div>
          <span className="editorial-eyebrow subscription-eyebrow">
            <Rss size={15} aria-hidden="true" /> RSS 订阅
          </span>
          <h1>订阅，慢慢读。</h1>
          <p>
            把新文章和笔记留在你习惯的阅读器里。
            <br />
            有更新时再来，按自己的节奏阅读。
          </p>
        </div>
        <dl className="subscription-scope">
          <div>
            <dt>订阅内容</dt>
            <dd>文章 · 技术笔记 · 生活随笔</dd>
          </div>
          <div>
            <dt>阅读方式</dt>
            <dd>摘要与原文链接</dd>
          </div>
          <div>
            <dt>收录范围</dt>
            <dd>最近 50 条公开内容</dd>
          </div>
        </dl>
      </header>
      <SubscriptionTools initialFeedUrl={absoluteUrl("/feed.xml")} />
      <section
        className="subscription-preview"
        aria-labelledby="subscription-recent"
      >
        <div className="editorial-section-head">
          <h2 id="subscription-recent">最近的更新</h2>
          <Link href="/archive">
            全部归档 <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
        {unavailable ? (
          <p className="editorial-error" role="alert">
            最近更新暂时无法读取。订阅地址仍可复制，请稍后刷新查看。
          </p>
        ) : entries.length ? (
          <ul className="subscription-entries">
            {entries.map((entry) => (
              <li key={entry.path}>
                <div className="subscription-entry-meta">
                  <span>{entry.kind === "post" ? "文章" : "笔记"}</span>
                  {entry.publishedAt && (
                    <time dateTime={entry.publishedAt.toISOString()}>
                      {shanghaiDate(entry.publishedAt)}
                    </time>
                  )}
                </div>
                <div className="subscription-entry-copy">
                  <h3>
                    <Link href={entry.path}>{entry.title}</Link>
                  </h3>
                  {entry.excerpt && <p>{entry.excerpt}</p>}
                </div>
                <ArrowUpRight
                  className="subscription-entry-arrow"
                  size={16}
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="editorial-empty">
            还没有公开更新，可以先订阅，等下一篇到来。
          </p>
        )}
      </section>
    </main>
  );
}
