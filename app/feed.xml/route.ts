import { readFeedEntries } from '@/lib/feed';
import { absoluteUrl, SITE_NAME, SITE_DESCRIPTION } from '@/lib/seo';
export const dynamic = 'force-dynamic';
const xml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
export async function GET() {
  try {
    const rows = await readFeedEntries();
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
