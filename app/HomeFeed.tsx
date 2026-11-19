import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import {
  ArticleRow,
  FeaturedArticle,
  NoteRow,
  DynamicEntry,
  type Listing,
} from '@/components/ContentEntries';
export default function HomeFeed({
  posts,
  notes,
  dynamics,
  postError,
  noteError,
  dynamicError,
  readingEntry,
}: {
  posts: Listing;
  notes: Listing;
  dynamics: Listing;
  postError?: boolean;
  noteError?: boolean;
  dynamicError?: boolean;
  readingEntry?: React.ReactNode;
}) {
  const series = posts.data.find((post) => post.series)?.series;
  return (
    <main className="editorial-page editorial-home">
      <section className="editorial-home-intro" data-sky-entry>
        <div>
          <span className="editorial-eyebrow">你好，我是若木</span>
          <h1>写代码，也记录生活。</h1>
          <p>
            记录前端、后端与 AI 应用实践，
            <br />
            也留下生活中的思考。
          </p>
          <div className="editorial-home-links">
            <Link href="/subscribe">RSS 订阅 ↗</Link>
            <Link href="/archive">文章归档 ↗</Link>
          </div>
        </div>
        {series && (
          <aside className="editorial-series">
            <span className="editorial-eyebrow">阅读系列</span>
            <h2>
              <Link href={'/series/' + series.slug}>{series.name}</Link>
            </h2>
            <p>{series.description || '按顺序阅读这一组文章。'}</p>
            <Link href={'/series/' + series.slug} className="editorial-read-link">
              查看系列 <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </aside>
        )}
      </section>
      {readingEntry}
      <section aria-labelledby="recent-posts">
        <div className="editorial-section-head">
          <h2 id="recent-posts">最近写下</h2>
          <Link href="/allBlogs">全部博客 ↗</Link>
        </div>
        {postError ? (
          <p role="alert" className="editorial-error">
            文章暂不可用，请稍后刷新
          </p>
        ) : posts.data.length ? (
          <>
            <FeaturedArticle item={posts.data[0]} showSeries={false} headingLevel={3} />
            {posts.data.slice(1).map((post) => (
              <ArticleRow key={post.id} item={post} headingLevel={3} />
            ))}
          </>
        ) : (
          <p className="editorial-empty">还没有公开文章</p>
        )}
      </section>
      <section className="editorial-home-section" aria-labelledby="recent-notes">
        <div className="editorial-section-head">
          <h2 id="recent-notes">最近的笔记</h2>
          <Link href="/notes">全部笔记 ↗</Link>
        </div>
        {noteError ? (
          <p role="alert" className="editorial-error">
            笔记暂不可用，请稍后刷新
          </p>
        ) : notes.data.length ? (
          notes.data.map((note) => <NoteRow key={note.id} item={note} headingLevel={3} />)
        ) : (
          <p className="editorial-empty">还没有公开笔记</p>
        )}
      </section>
      <section className="editorial-home-section" aria-labelledby="recent-dynamics">
        <div className="editorial-section-head">
          <h2 id="recent-dynamics">最近动态</h2>
          <Link href="/allStatus">全部动态 ↗</Link>
        </div>
        {dynamicError ? (
          <p role="alert" className="editorial-error">
            动态暂不可用，请稍后刷新
          </p>
        ) : dynamics.data.length ? (
          <div className="editorial-timeline">
            {dynamics.data.map((item) => (
              <DynamicEntry key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="editorial-empty">还没有公开动态</p>
        )}
      </section>
    </main>
  );
}
