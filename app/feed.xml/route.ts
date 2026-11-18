import { prisma } from '@/lib/prisma';
import { absoluteUrl, SITE_NAME, SITE_DESCRIPTION } from '@/lib/seo';
export const dynamic = 'force-dynamic';
const xml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
export async function GET() {
  try {
    const [posts, notes] = await Promise.all([
      prisma.post.findMany({
        where: { published: true },
        select: { slug: true, title: true, excerpt: true, publishedAt: true },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 50,
      }),
      prisma.note.findMany({
        where: { published: true },
        select: { slug: true, title: true, excerpt: true, publishedAt: true },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 50,
      }),
    ]);
    const rows = [
      ...posts.map((p) => ({ ...p, url: absoluteUrl('/posts/' + p.slug) })),
      ...notes.map((p) => ({ ...p, url: absoluteUrl('/notes/' + p.slug) })),
    ]
      .sort((a, b) => +(b.publishedAt ?? 0) - +(a.publishedAt ?? 0) || a.url.localeCompare(b.url))
      .slice(0, 50);
    const entries = rows
      .map(
        (p) =>
          '<item><title>' +
          xml(p.title) +
          '</title><link>' +
          xml(p.url) +
          '</link><guid>' +
          xml(p.url) +
          '</guid><description>' +
          xml(p.excerpt ?? '') +
          '</description>' +
          (p.publishedAt ? '<pubDate>' + p.publishedAt.toUTCString() + '</pubDate>' : '') +
          '</item>',
      )
      .join('');
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>' +
        xml(SITE_NAME) +
        '</title><link>' +
        xml(absoluteUrl()) +
        '</link><description>' +
        xml(SITE_DESCRIPTION) +
        '</description>' +
        entries +
        '</channel></rss>',
      {
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch {
    return new Response('Feed temporarily unavailable', { status: 503 });
  }
}
