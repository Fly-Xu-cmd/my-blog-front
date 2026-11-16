import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
if (!process.env.DATABASE_URL?.includes('127.0.0.1:13316/blog_test'))
  throw new Error('Isolated test database required');
async function main() {
  try {
    const category = await db.category.upsert({
      where: { name: 'E2E Category' },
      create: { name: 'E2E Category' },
      update: {},
    });
    const tag = await db.tag.upsert({
      where: { name: 'E2E Public Tag' },
      create: { name: 'E2E Public Tag' },
      update: {},
    });
    const series = await db.series.upsert({
      where: { slug: 'e2e-series' },
      create: { name: 'E2E Series', slug: 'e2e-series' },
      update: {},
    });
    const content =
      '## 中文标题\n\nReadable server body\n\n## 中文标题\n\n<script>window.attack=1</script>\n\n<img src=x onerror="window.attack=2">\n\n[bad](javascript:window.attack=3)\n\n~~~mermaid\ngraph TD; A-->B\n~~~';
    await db.post.upsert({
      where: { slug: 'e2e-public' },
      create: {
        slug: 'e2e-public',
        title: 'E2E Public',
        content,
        published: true,
        publishedAt: new Date(),
        categoryId: category.id,
        seriesId: series.id,
        seriesOrder: 1,
        tags: { create: { tagId: tag.id } },
      },
      update: { content, published: true },
    });
    await db.post.upsert({
      where: { slug: 'e2e-private' },
      create: {
        slug: 'e2e-private',
        title: 'E2E_PRIVATE_MARKER',
        content: 'secret draft body',
        published: false,
      },
      update: { published: false },
    });
    for (let i = 0; i < 12; i++)
      await db.post.upsert({
        where: { slug: 'e2e-search-' + i },
        create: {
          slug: 'e2e-search-' + i,
          title: 'E2E_SEARCH ' + i,
          excerpt: 'Only summary',
          content: 'Unique body search phrase',
          published: true,
          publishedAt: new Date(Date.now() - i * 1000),
        },
        update: { published: true },
      });
    await db.note.upsert({
      where: { slug: 'e2e-note' },
      create: {
        slug: 'e2e-note',
        syncId: 'e2e/note',
        hash: 'hash',
        title: 'E2E Note',
        content: 'Note server body',
        published: true,
        publishedAt: new Date(),
        excerpt: 'Note summary',
        kind: 'ESSAY',
      },
      update: { published: true },
    });
    await db.dynamic.upsert({
      where: { id: 900001 },
      create: {
        id: 900001,
        title: 'E2E Dynamic',
        content: 'Dynamic server body',
        excerpt: 'summary',
        published: true,
        publishedAt: new Date(),
      },
      update: { published: true },
    });
  } finally {
    await db.$disconnect();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
