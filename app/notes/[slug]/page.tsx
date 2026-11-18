import type { Metadata } from 'next';
import { publicContent } from '@/lib/public-content';
import { absoluteUrl, articleOpenGraph, extractDescription } from '@/lib/seo';
import { safeJson } from '@/lib/markdown';
import Article from '@/components/Article';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = (await params).slug;
  const data = await publicContent('note', key);
  return {
    title: data.title || '笔记',
    description: data.excerpt || extractDescription(data.content),
    ...articleOpenGraph(
      data.title || '笔记',
      data.excerpt || extractDescription(data.content),
      absoluteUrl('/notes/' + key),
      'cover' in data ? data.cover : undefined,
    ),
  };
}
export default async function Page({ params }: Props) {
  const key = (await params).slug;
  const data = await publicContent('note', key);
  const url = '/notes/' + key;
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    datePublished: (data.publishedAt ?? data.createdAt).toISOString(),
    dateModified: data.updatedAt.toISOString(),
    url: absoluteUrl(url),
    author: { '@type': 'Person', name: '若木' },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJson(structured) }}
      />
      <Article resource="note" data={data} url={url} />
    </>
  );
}
