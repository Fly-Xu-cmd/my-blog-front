import { afterAll, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/series/[id]/posts/route';

afterAll(() => prisma.$disconnect());
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (authenticated = true) =>
  new Request('http://localhost/api/series/1/posts', {
    headers: authenticated
      ? {
          Authorization: `Bearer ${jwt.sign({ username: 'test-admin' }, process.env.JWT_SECRET!)}`,
        }
      : {},
  });
it('rejects anonymous reads before validating an id', async () => {
  const query = vi.spyOn(prisma.series, 'findUnique');
  try {
    expect((await GET(request(false), ctx('invalid'))).status).toBe(401);
    const forbidden = new Request('http://localhost/api/series/1/posts', {
      headers: {
        Authorization: `Bearer ${jwt.sign({ username: 'another-admin' }, process.env.JWT_SECRET!)}`,
      },
    });
    expect((await GET(forbidden, ctx('1'))).status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  } finally {
    query.mockRestore();
  }
});
it('loads only this series in order, including drafts, without bodies or pagination truncation', async () => {
  expect(process.env.DATABASE_URL).toContain('127.0.0.1:13316/blog_test');
  const series = await prisma.series.create({
    data: { name: randomUUID(), slug: randomUUID() },
  });
  try {
    await prisma.post.createMany({
      data: Array.from({ length: 53 }, (_, i) => ({
        title: `member ${i}`,
        slug: randomUUID(),
        content: 'private body',
        seriesId: series.id,
        seriesOrder: 53 - i,
        published: i % 2 === 0,
      })),
    });
    const response = await GET(request(), ctx(String(series.id)));
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const result = await response.json();
    expect(result.total).toBe(53);
    expect(
      result.data.map((post: { seriesOrder: number }) => post.seriesOrder),
    ).toEqual(Array.from({ length: 53 }, (_, i) => i + 1));
    expect(
      result.data.some((post: { published: boolean }) => !post.published),
    ).toBe(true);
    expect(result.data.every((post: object) => !('content' in post))).toBe(
      true,
    );
  } finally {
    await prisma.post.deleteMany({ where: { seriesId: series.id } });
    await prisma.series.delete({ where: { id: series.id } });
  }
});
it('distinguishes invalid identifiers from missing series', async () => {
  expect((await GET(request(), ctx('0'))).status).toBe(400);
  expect((await GET(request(), ctx('2147483647'))).status).toBe(404);
});
it('returns a service error rather than an empty list on a database failure', async () => {
  const query = vi
    .spyOn(prisma.series, 'findUnique')
    .mockRejectedValueOnce(new Error('private database details'));
  try {
    const response = await GET(request(), ctx('1'));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private database details');
  } finally {
    query.mockRestore();
  }
});
