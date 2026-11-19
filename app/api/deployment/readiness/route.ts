import { prisma } from '@/lib/prisma';
import { realpathSync } from 'node:fs';
import { join } from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    if (!process.env.JWT_SECRET || !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD)
      throw new Error('Authentication configuration is unavailable');
    // A candidate is advertised only after release health checks commit current.
    if (process.env.NODE_ENV === 'production' && (!process.env.BLOG_DEPLOY_ROOT ||
      realpathSync(join(process.env.BLOG_DEPLOY_ROOT, 'current')) !== realpathSync(process.cwd())))
      throw new Error('Release is not committed');
    // Validate required schema without reading or returning any content, including drafts.
    await Promise.all([
      prisma.$queryRaw`SELECT publishedAt,seriesId,seriesOrder FROM Post LIMIT 0`,
      prisma.$queryRaw`SELECT excerpt,kind,publishedAt FROM Note LIMIT 0`,
      prisma.$queryRaw`SELECT published,publishedAt FROM Dynamic LIMIT 0`,
      prisma.$queryRaw`SELECT id,slug FROM Series LIMIT 0`,
      prisma.$queryRaw`SELECT resource,actor,payloadHash,resultId FROM CreationRequest LIMIT 0`,
      prisma.$queryRaw`SELECT title,subtitle,content,revision FROM AboutPage LIMIT 0`,
      prisma.$queryRaw`SELECT fields,revision FROM ReadingEntry LIMIT 0`,
    ]);
    return Response.json({ ok: true, contractVersion: 1, capabilities: [
      'admin-header-auth', 'content-summaries', 'idempotent-create', 'dynamic-drafts', 'series-v1', 'about-page-v1', 'reading-entry-v1',
    ] }, { headers });
  } catch {
    return Response.json({ ok: false, code: 'API_NOT_READY' }, { status: 503, headers });
  }
}
