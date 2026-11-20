import Link from 'next/link';
import CdnImage from './CdnImage';
import { ArrowUpRight } from 'lucide-react';
import { shanghaiDate } from '@/lib/markdown';

export type Summary = {
  id: number;
  title: string | null;
  slug?: string;
  excerpt: string | null;
  createdAt: string;
  publishedAt: string | null;
  category?: { name: string } | null;
  tags?: string[];
  cover?: string | null;
  kind?: string;
  series?: { name: string; slug: string; description?: string | null } | null;
};
export type Listing = {
  data: Summary[];
  total: number;
  current: number;
  pageSize: number;
  pages: number;
};
export type Resource = 'post' | 'note' | 'dynamic';
export const entryUrl = (item: Summary, resource: Resource = 'post') =>
  resource === 'dynamic'
    ? '/status/' + item.id
    : (resource === 'post' ? '/posts/' : '/notes/') + item.slug;
export const entryDate = (item: Summary) => item.publishedAt ?? item.createdAt;
export const entryMonth = (item: Summary) => {
  const [year, month] = shanghaiDate(entryDate(item)).split('/');
  return year + ' 年 ' + Number(month) + ' 月';
};
function Topics({ item }: { item: Summary }) {
  return (
    <div className="editorial-topics">
      {item.category && <span>{item.category.name}</span>}
      {item.tags?.slice(0, 3).map((tag) => (
        <Link key={tag} href={'/tags/' + encodeURIComponent(tag)}>
          #{tag}
        </Link>
      ))}
    </div>
  );
}
export function FeaturedArticle({
  item,
  showSeries = true,
  headingLevel = 2,
}: {
  item: Summary;
  showSeries?: boolean;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const series = showSeries ? item.series : null;
  const hasAside = Boolean(item.cover || series);
  return (
    <article className={'editorial-feature' + (hasAside ? ' has-aside' : '')}>
      <div className="editorial-feature-copy">
        <span className="editorial-eyebrow">最近写下 · {item.category?.name || '博客'}</span>
        <Heading className="editorial-feature-title">
          <Link href={entryUrl(item)}>{item.title}</Link>
        </Heading>
        {item.excerpt && <p className="editorial-feature-excerpt">{item.excerpt}</p>}
        <div className="editorial-meta">
          <time dateTime={entryDate(item)}>{shanghaiDate(entryDate(item))}</time>
          <Topics item={item} />
        </div>
        <Link href={entryUrl(item)} className="editorial-read-link">
          阅读全文 <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
      {hasAside && (
        <div className="editorial-feature-aside">
          {item.cover && (
            <Link
              href={entryUrl(item)}
              className="editorial-feature-cover"
              aria-label={'阅读：' + item.title}
            >
              <CdnImage
                variant="feature"
                src={item.cover}
                alt=""
                width={800}
                height={500}
                sizes="(max-width: 760px) 100vw, 380px"
                className="editorial-cover-image"
              />
            </Link>
          )}
          {series && (
            <aside className={'editorial-series' + (item.cover ? ' below-cover' : '')}>
              <span className="editorial-eyebrow">阅读系列</span>
              <h3>
                <Link href={'/series/' + series.slug}>{series.name}</Link>
              </h3>
              <p>{series.description || '按顺序阅读这一组文章。'}</p>
              <Link href={'/series/' + series.slug} className="editorial-read-link">
                查看系列 <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </aside>
          )}
        </div>
      )}
    </article>
  );
}
export function ArticleRow({ item, headingLevel = 2 }: { item: Summary; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <article className={'editorial-article-row' + (item.cover ? ' has-cover' : '')}>
      <time dateTime={entryDate(item)}>{shanghaiDate(entryDate(item))}</time>
      <div className="editorial-row-copy">
        <Heading>
          <Link href={entryUrl(item)}>{item.title}</Link>
        </Heading>
        {item.excerpt && <p>{item.excerpt}</p>}
        <Topics item={item} />
      </div>
      <Link
        href={entryUrl(item)}
        className="editorial-row-visual"
        aria-label={'阅读：' + item.title}
      >
        {item.cover ? (
          <CdnImage
            variant="thumbnail"
            src={item.cover}
            alt=""
            width={320}
            height={200}
            sizes="(max-width: 760px) 100px, 160px"
            className="editorial-cover-image"
          />
        ) : (
          <ArrowUpRight size={21} aria-hidden="true" />
        )}
      </Link>
    </article>
  );
}
export function NoteRow({ item, headingLevel = 2 }: { item: Summary; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <article className="editorial-note-row">
      <time dateTime={entryDate(item)}>{shanghaiDate(entryDate(item))}</time>
      <div className="editorial-row-copy">
        <Heading>
          <Link href={entryUrl(item, 'note')}>{item.title}</Link>
        </Heading>
        {item.excerpt && <p>{item.excerpt}</p>}
      </div>
      <div className="editorial-note-topics">
        <span>{item.kind === 'ESSAY' ? '生活随笔' : '技术笔记'}</span>
        <Topics item={item} />
      </div>
    </article>
  );
}
export function DynamicEntry({ item }: { item: Summary }) {
  return (
    <article className="editorial-moment">
      <time dateTime={entryDate(item)}>{shanghaiDate(entryDate(item))}</time>
      {item.title && (
        <h3>
          <Link href={entryUrl(item, 'dynamic')}>{item.title}</Link>
        </h3>
      )}
      {item.excerpt && <p>{item.excerpt}</p>}
      <Link href={entryUrl(item, 'dynamic')} className="editorial-read-link">
        查看动态 <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    </article>
  );
}
