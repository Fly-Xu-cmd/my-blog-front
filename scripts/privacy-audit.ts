import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { writeFile } from 'node:fs/promises';
const explicit = process.env.AUDIT_DATABASE_URL;
if (!explicit && !process.argv.includes('--configured'))
  throw new Error('Specify AUDIT_DATABASE_URL or --configured');
if (!explicit && !process.env.DATABASE_URL) throw new Error('Database URL is not configured');
const client = new PrismaClient({
  datasources: { db: { url: explicit ?? process.env.DATABASE_URL } },
  log: [],
});
async function main() {
  try {
    const [posts, notes, dynamics] = await Promise.all([
      client.post.findMany({
        where: { published: true },
        select: {
          id: true,
          slug: true,
          title: true,
          createdAt: true,
          category: { select: { name: true } },
        },
        orderBy: { id: 'asc' },
      }),
      client.note.findMany({
        where: { published: true },
        select: {
          id: true,
          slug: true,
          title: true,
          syncId: true,
          createdAt: true,
          category: { select: { name: true } },
        },
        orderBy: { id: 'asc' },
      }),
      client.dynamic.findMany({
        where: { published: true },
        select: { id: true, title: true, createdAt: true },
        orderBy: { id: 'asc' },
      }),
    ]);
    const rows = [
      ...posts.map((p) => ({ ...p, resource: 'post', url: '/posts/' + p.slug })),
      ...notes.map((n) => ({ ...n, resource: 'note', url: '/notes/' + n.slug })),
      ...dynamics.map((d) => ({ ...d, resource: 'dynamic', url: '/status/' + d.id })),
    ].map((row) => ({
      ...row,
      reviewStatus: '待后台人工核对',
      priority: /工作日志|面试|密码|凭据|客户|合同/.test(JSON.stringify(row))
        ? '重点核对'
        : '常规核对',
    }));
    const report = {
      generatedAt: new Date().toISOString(),
      mode: 'read-only',
      counts: { posts: posts.length, notes: notes.length, dynamics: dynamics.length },
      rows,
    };
    const output = process.argv.find((a) => a.startsWith('--output='))?.slice(9);
    if (output) await writeFile(output, JSON.stringify(report, null, 2), 'utf8');
    else console.log(JSON.stringify(report, null, 2));
    if (output) console.log(JSON.stringify({ output, counts: report.counts }));
  } finally {
    await client.$disconnect();
  }
}
void main().catch(() => {
  console.error('Read-only audit unavailable; check configured database connection');
  process.exitCode = 1;
});
