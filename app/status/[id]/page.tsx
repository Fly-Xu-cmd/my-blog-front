import type { Metadata } from 'next';
import { publicContent } from '@/lib/public-content';
import { absoluteUrl, articleOpenGraph, extractDescription } from '@/lib/seo';
import { safeJson } from '@/lib/markdown';
import Article from '@/components/Article';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = (await params).id;
  const data = await publicContent('dynamic', key);
  return {
    title: data.title || '动态',
    description: data.excerpt || extractDescription(data.content),
    ...articleOpenGraph(
      data.title || '动态',
      data.excerpt || extractDescription(data.content),
      absoluteUrl('/status/' + key),
      'cover' in data ? data.cover : undefined,
    ),
  };
}
export default async function Page({ params }: Props) {
  const key = (await params).id;
  const data = await publicContent('dynamic', key);
  const url = '/status/' + key;
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
      <Article resource="dynamic" data={data} url={url} />
    </>
  );
}
