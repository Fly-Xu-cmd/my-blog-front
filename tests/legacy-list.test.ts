import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { listContent, type Resource } from '@/lib/content';

it('keeps unpaged legacy public lists complete while explicit and admin requests stay paginated', async () => {
  const marker = 'legacy-' + randomUUID();
  const rows = Array.from({ length: 13 }, (_, i) => ({
    title: marker + '-' + i,
    content: 'legacy body',
    excerpt: 'legacy summary',
    published: i < 12,
    publishedAt: i < 12 ? new Date() : null,
  }));
  try {
    await prisma.post.createMany({ data: rows.map((r) => ({ ...r, slug: r.title })) });
    await prisma.note.createMany({ data: rows.map((r) => ({ ...r, slug: r.title, syncId: r.title })) });
    await prisma.dynamic.createMany({ data: rows });
    for (const resource of ['post', 'note', 'dynamic'] as Resource[]) {
      const legacy = await listContent(resource, new URLSearchParams({ q: marker }));
      expect(legacy.total).toBe(12);
      expect(legacy.data).toHaveLength(12);
      expect(legacy.data.every((r) => r.published)).toBe(true);
      expect(legacy.data[0]).toHaveProperty('content');
      const paged = await listContent(resource, new URLSearchParams({ q: marker, current: '1' }));
      expect(paged.data).toHaveLength(10);
      const admin = await listContent(resource, new URLSearchParams({ q: marker }), true);
      expect(admin.total).toBe(13);
      expect(admin.data).toHaveLength(10);
    }
  } finally {
    await prisma.post.deleteMany({ where: { title: { startsWith: marker } } });
    await prisma.note.deleteMany({ where: { title: { startsWith: marker } } });
    await prisma.dynamic.deleteMany({ where: { title: { startsWith: marker } } });
    await prisma.$disconnect();
  }
});
