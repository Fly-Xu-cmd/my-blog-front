import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { extractDescription } from '../lib/seo';
const explicit = process.env.BACKFILL_DATABASE_URL;
if (!explicit && !process.argv.includes('--configured'))
  throw new Error('Specify BACKFILL_DATABASE_URL or explicitly pass --configured');
if (!explicit && !process.env.DATABASE_URL) throw new Error('Database URL is not configured');
const client = new PrismaClient({
  datasources: { db: { url: explicit ?? process.env.DATABASE_URL } },
});
const apply = process.argv.includes('--apply');
let cursor = 0,
  count = 0;
async function main() {
  try {
    while (true) {
      const rows = await client.note.findMany({
        where: { id: { gt: cursor }, excerpt: null },
        select: { id: true, content: true },
        take: 100,
        orderBy: { id: 'asc' },
      });
      if (!rows.length) break;
      for (const row of rows) {
        if (apply)
          await client.note.updateMany({
            where: { id: row.id, excerpt: null },
            data: { excerpt: extractDescription(row.content) },
          });
        count++;
        cursor = row.id;
      }
    }
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', noteExcerpts: count }));
    const audit = await client.note.findMany({
      where: {
        published: true,
        OR: [
          { syncId: { contains: '工作日志' } },
          { syncId: { contains: '面试' } },
          { title: { contains: '工作日志' } },
        ],
      },
      select: { id: true, slug: true, title: true, syncId: true },
    });
    console.log(JSON.stringify({ privacyAuditCandidates: audit }, null, 2));
  } finally {
    await client.$disconnect();
  }
}
void main().catch(() => {
  console.error('Backfill failed; verify database configuration');
  process.exitCode = 1;
});
