import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { POST as createPost, GET as posts } from '@/app/api/posts/route';
import {
  GET as getPost,
  PUT as updatePost,
  DELETE as deletePost,
} from '@/app/api/posts/[slug]/route';
import { GET as notes, POST as createNote } from '@/app/api/notes/route';
import { PUT as setNote, GET as getNote } from '@/app/api/notes/[slug]/route';
import { POST as sync } from '@/app/api/notes/sync/route';
import {
  GET as tags,
  POST as createTag,
  PUT as editTag,
  DELETE as deleteTag,
} from '@/app/api/tags/route';
import {
  POST as createCategory,
  PUT as editCategory,
  DELETE as deleteCategory,
} from '@/app/api/categories/route';
import { POST as localUpload } from '@/app/api/upload/route';
import { POST as qiniuUpload } from '@/app/api/upload-qiniu/route';
import {
  POST as createDynamic,
  PUT as editDynamicCollection,
  PATCH as patchDynamic,
  DELETE as deleteDynamicCollection,
} from '@/app/api/dynamics/route';
import { PUT as editDynamic, DELETE as deleteDynamic } from '@/app/api/dynamics/[id]/route';
import {
  POST as createSeries,
  PUT as editSeries,
  DELETE as deleteSeries,
} from '@/app/api/series/route';
import { POST as reorder } from '@/app/api/series/[id]/reorder/route';
import { cached } from '@/lib/analytics-cache';
import { GET as stats } from '@/app/api/analytics/stats/route';
import { GET as overview } from '@/app/api/admin/content-stats/route';
import { shanghaiDayStartUtc } from '@/lib/analytics';
import { GET as site } from '@/app/api/analytics/site/route';
import { POST as track } from '@/app/api/analytics/track/route';
import { POST as oldAuth } from '@/app/api/login/[token]/route';
import { GET as me } from '@/app/api/auth/me/route';
import { GET as feed } from '@/app/feed.xml/route';
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/app/api/notes/auth', () => ({ checkAuth: vi.fn(async () => true) }));
const token = () =>
  jwt.sign({ username: 'test-admin' }, process.env.JWT_SECRET!, { algorithm: 'HS256' });
const request = (url: string, method = 'GET', data?: unknown, auth = true, key?: string) =>
  new Request('http://localhost' + url, {
    method,
    headers: {
      ...(auth ? { authorization: 'Bearer ' + token() } : {}),
      'Content-Type': 'application/json',
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });
const payload = (title: string, published = false) => ({
  title,
  content: '## 正文\n\n测试正文',
  tags: [],
  published,
});
beforeAll(async () => {
  expect(process.env.DATABASE_URL).toContain('127.0.0.1:13316/blog_test');
  await prisma.$connect();
  await redis.flushdb();
  await prisma.pageView.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});
describe('permission and creation', () => {
  it('denies all anonymous management methods before body parsing', async () => {
    for (const handler of [
      createPost,
      createNote,
      createTag,
      editTag,
      deleteTag,
      createCategory,
      editCategory,
      deleteCategory,
      localUpload,
      qiniuUpload,
      createDynamic,
      editDynamicCollection,
      patchDynamic,
      deleteDynamicCollection,
      createSeries,
      editSeries,
      deleteSeries,
    ])
      expect(
        (await handler(new Request('http://localhost/api/test', { method: 'POST' }))).status,
      ).toBe(401);
    for (const handler of [updatePost, deletePost, setNote])
      expect(
        (await handler(request('/api/test', 'PUT', undefined, false), ctx('missing'))).status,
      ).toBe(401);
    expect(
      (
        await reorder(request('/api/test', 'POST', undefined, false), {
          params: Promise.resolve({ id: '1' }),
        })
      ).status,
    ).toBe(401);
    for (const handler of [editDynamic, deleteDynamic])
      expect(
        (
          await handler(request('/api/test', 'PUT', undefined, false), {
            params: Promise.resolve({ id: '1' }),
          })
        ).status,
      ).toBe(401);
  });
  it('rejects bad, expired and non-admin tokens; old URL auth is retired', async () => {
    for (const authorization of [
      'Bearer bad',
      'Bearer ' + jwt.sign({ username: 'test-admin' }, process.env.JWT_SECRET!, { expiresIn: -1 }),
      'Bearer ' + jwt.sign({ username: 'visitor' }, process.env.JWT_SECRET!),
    ])
      expect([401, 403]).toContain(
        (await me(new Request('http://localhost/api/auth/me', { headers: { authorization } })))
          .status,
      );
    expect((await oldAuth()).status).toBe(410);
  });
  it('concurrent same-key creates once, rejects changed payload and cannot resurrect deletion', async () => {
    const key = randomUUID(),
      data = payload('幂等 ' + randomUUID());
    const responses = await Promise.all(
      Array.from({ length: 6 }, () => createPost(request('/api/posts', 'POST', data, true, key))),
    );
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 200, 200, 200]);
    const rows = await Promise.all(responses.map((r) => r.json()));
    expect(new Set(rows.map((r) => r.data.id)).size).toBe(1);
    expect(await prisma.post.count({ where: { title: data.title } })).toBe(1);
    expect(
      (await createPost(request('/api/posts', 'POST', { ...data, title: 'changed' }, true, key)))
        .status,
    ).toBe(409);
    await deletePost(request('/api/posts', 'DELETE'), ctx(rows[0].data.slug));
    expect((await createPost(request('/api/posts', 'POST', data, true, key))).status).toBe(410);
  });
  it('concurrent same-title requests allocate different slugs and title edits retain URL', async () => {
    const title = '并发 ' + randomUUID();
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        createPost(request('/api/posts', 'POST', payload(title), true, randomUUID())),
      ),
    );
    const rows = await Promise.all(responses.map((r) => r.json()));
    expect(rows.every((r) => r.ok)).toBe(true);
    expect(new Set(rows.map((r) => r.data.slug)).size).toBe(5);
    const row = rows[0].data;
    const updated = await (
      await updatePost(request('/api/posts', 'PUT', { title: '新标题' }), ctx(row.slug))
    ).json();
    expect(updated.data.slug).toBe(row.slug);
  });
  it('isolates drafts and retains first-publication time', async () => {
    const name = 'private-' + randomUUID(),
      cat = await prisma.category.create({ data: { name } }),
      tag = await prisma.tag.create({ data: { name } });
    const row = await prisma.post.create({
      data: {
        title: '草稿 ' + name,
        content: '正文',
        published: false,
        slug: name,
        categoryId: cat.id,
        tags: { create: { tagId: tag.id } },
      },
    });
    expect((await getPost(request('/api/posts/' + row.slug), ctx(row.slug))).status).toBe(404);
    expect((await posts(request('/api/posts?published=false'))).status).toBe(403);
    const listed = await (await posts(request('/api/posts'))).json();
    expect(listed.data.some((p: { id: number }) => p.id === row.id)).toBe(false);
    const publicTags = await (await tags(request('/api/tags'))).json();
    expect(publicTags.data.some((t: { name: string }) => t.name === name)).toBe(false);
    const first = await (
      await updatePost(request('/api/posts', 'PUT', { published: true }), ctx(row.slug))
    ).json();
    await updatePost(request('/api/posts', 'PUT', { published: false }), ctx(row.slug));
    const second = await (
      await updatePost(request('/api/posts', 'PUT', { published: true }), ctx(row.slug))
    ).json();
    expect(second.data.publishedAt).toBe(first.data.publishedAt);
    const summary = await (await posts(request('/api/posts?q=' + name))).json();
    expect(summary.data[0]).not.toHaveProperty('content');
  });
  it('sync preserves visibility/kind and updates metadata despite identical content hash', async () => {
    const syncId = 'test/' + randomUUID(),
      slug = 'sync-' + randomUUID(),
      data = { syncId, slug, title: '同步笔记', content: '正文', hash: 'same' };
    expect((await sync(request('/api/notes/sync', 'POST', data))).status).toBe(200);
    expect((await prisma.note.findUniqueOrThrow({ where: { syncId } })).published).toBe(false);
    expect((await getNote(request('/api/notes/' + slug), ctx(slug))).status).toBe(404);
    expect(
      (await sync(request('/api/notes/sync', 'POST', { ...data, syncId: 'other' }))).status,
    ).toBe(409);
    expect(
      (await sync(request('/api/notes/sync', 'POST', { ...data, slug: 'different' }))).status,
    ).toBe(409);
    await setNote(request('/api/notes', 'PUT', { published: true, kind: 'ESSAY' }), ctx(slug));
    const tag = await prisma.tag.create({ data: { name: 'sync-' + randomUUID() } });
    await sync(request('/api/notes/sync', 'POST', { ...data, tagIds: [tag.id] }));
    const row = await prisma.note.findUniqueOrThrow({ where: { syncId } });
    expect(row.published).toBe(true);
    expect(row.kind).toBe('ESSAY');
    expect(await prisma.noteTag.count({ where: { noteId: row.id, tagId: tag.id } })).toBe(1);
    expect(
      (await (await notes(request('/api/notes?q=' + encodeURIComponent('正文')))).json()).data[0],
    ).not.toHaveProperty('content');
  });
  it('rejects series position conflicts; reorder commits atomically; RSS hides drafts', async () => {
    const series = await prisma.series.create({
      data: { name: '系列' + randomUUID(), slug: 'series-' + randomUUID() },
    });
    const a = await prisma.post.create({
      data: {
        title: 'Series A',
        content: 'A',
        slug: 'a-' + randomUUID(),
        published: true,
        publishedAt: new Date(),
        seriesId: series.id,
        seriesOrder: 1,
      },
    });
    const b = await prisma.post.create({
      data: {
        title: 'Series B',
        content: 'B',
        slug: 'b-' + randomUUID(),
        seriesId: series.id,
        seriesOrder: 2,
      },
    });
    expect(
      (
        await createPost(
          request(
            '/api/posts',
            'POST',
            { ...payload('抢号'), seriesId: series.id, seriesOrder: 1 },
            true,
            randomUUID(),
          ),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await reorder(request('/api/series', 'POST', { postIds: [b.id, a.id] }), {
          params: Promise.resolve({ id: String(series.id) }),
        })
      ).status,
    ).toBe(200);
    expect((await prisma.post.findUniqueOrThrow({ where: { id: a.id } })).seriesOrder).toBe(2);
    const xml = await (await feed()).text();
    expect(xml).toContain(a.slug);
    expect(xml).not.toContain(b.slug);
  });
});
describe('real Redis cache', () => {
  it('single-flights totals; deduplicates visitors across days; rate limits with retry-after', async () => {
    const visitorId = randomUUID();
    await prisma.pageView.createMany({
      data: [
        { path: '/test', visitorId, createdAt: new Date('2026-11-14') },
        { path: '/test', visitorId, createdAt: new Date('2026-11-15') },
      ],
    });
    await redis.del('analytics:cache:totals');
    const count = vi.spyOn(prisma.pageView, 'count'),
      results = await Promise.all(Array.from({ length: 12 }, () => site())),
      rows = await Promise.all(results.map((r) => r.json()));
    expect(rows.every((r) => r.pv === 2 && r.uv === 1)).toBe(true);
    expect(count).toHaveBeenCalledTimes(1);
    count.mockRestore();
    process.env.PV_RATE_LIMIT = '1';
    await redis.del('analytics:rate:track:untrusted');
    expect(
      (await track(request('/api/analytics/track', 'POST', { path: '/test', visitorId }, false)))
        .status,
    ).toBe(200);
    const limited = await track(
      request('/api/analytics/track', 'POST', { path: '/test', visitorId }, false),
    );
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0);
  });
});

describe('failure boundaries', () => {
  it('Redis failure returns 503 without querying the database', async () => {
    const get = vi.spyOn(redis, 'get').mockRejectedValueOnce(new Error('offline'));
    const load = vi.fn();
    await expect(cached('fault-' + randomUUID(), load)).rejects.toMatchObject({ status: 503 });
    expect(load).not.toHaveBeenCalled();
    get.mockRestore();
  });
  it('update omission preserves summary; null clears taxonomy; failed relation update rolls back content', async () => {
    const tag = await prisma.tag.create({ data: { name: 'tx-' + randomUUID() } });
    const row = await prisma.post.create({
      data: {
        title: 'original',
        content: 'old',
        excerpt: 'keep summary',
        slug: 'tx-' + randomUUID(),
        tags: { create: { tagId: tag.id } },
      },
    });
    expect(
      (
        await updatePost(
          request('/api/posts', 'PUT', { title: 'mutated', categoryId: 99999999 }),
          ctx(row.slug),
        )
      ).status,
    ).toBe(400);
    expect((await prisma.post.findUniqueOrThrow({ where: { id: row.id } })).title).toBe('original');
    const updated = await (
      await updatePost(
        request('/api/posts', 'PUT', { content: 'new body', tags: null }),
        ctx(row.slug),
      )
    ).json();
    expect(updated.data.excerpt).toBe('keep summary');
    expect(updated.data.tags).toEqual([]);
  });
  it('trend, normalized popular paths and referrers share the selected date interval', async () => {
    await prisma.pageView.deleteMany();
    await prisma.pageView.createMany({
      data: [
        { path: '/frontend/posts/a', visitorId: randomUUID(), referrerHost: 'recent.example' },
        { path: '/posts/a', visitorId: randomUUID(), referrerHost: 'recent.example' },
        {
          path: '/old',
          visitorId: randomUUID(),
          referrerHost: 'old.example',
          createdAt: new Date(Date.now() - 40 * 86400000),
        },
      ],
    });
    const data = await (await stats(request('/api/analytics/stats?range=7d'))).json();
    expect(data.trend).toHaveLength(7);
    expect(data.topPages).toEqual([{ path: '/posts/a', count: 2, title: '/posts/a', kind: '页面', url: null }]);
    expect(data.referrers).toEqual([{ host: 'recent.example', count: 2 }]);
    expect(data.trend.reduce((sum: number, row: { pv: number }) => sum + row.pv, 0)).toBe(2);
    expect(data.period).toEqual({ pv: 2, uv: 2 });
    expect(data.range).toBe('7d');
  });
});

it("custom reports share Shanghai date boundaries across analytics and content trends", async () => {
  const visitor = randomUUID(),
    other = randomUUID(),
    slug = randomUUID();
  const start = new Date("2000-02-28T00:00:00+08:00"),
    end = new Date("2000-03-02T00:00:00+08:00");
  const cacheKeys = [
    `analytics:cache:stats-v3:/blog_test:custom:2000-02-28:2000-03-01:all:${shanghaiDayStartUtc().toISOString()}`,
    "analytics:cache:content-overview-v3:/blog_test:2000-02-28:2000-03-01",
  ];
  const req = (path: string) => request(path);

  expect(process.env.DATABASE_URL).toContain(":13316/blog_test");
  await redis.del(...cacheKeys);
  const post = await prisma.post.create({
    data: {
      slug,
      title: "Report range fixture",
      content: "range body",
      createdAt: start,
      publishedAt: new Date(end.getTime() - 1000),
      published: true,
    },
  });
  const postId = post.id;
  await prisma.pageView.createMany({
    data: [
      {
        visitorId: visitor,
        path: "/posts/" + slug,
        referrerHost: "range.invalid",
        createdAt: new Date(start.getTime() - 1000),
      },
      {
        visitorId: visitor,
        path: "/posts/" + slug,
        referrerHost: "range.invalid",
        createdAt: start,
      },
      {
        visitorId: visitor,
        path: "/posts/" + slug,
        referrerHost: "range.invalid",
        createdAt: new Date(end.getTime() - 1000),
      },
      {
        visitorId: other,
        path: "/posts/" + slug,
        referrerHost: "range.invalid",
        createdAt: new Date(end.getTime() - 1000),
      },
      {
        visitorId: other,
        path: "/posts/" + slug,
        referrerHost: "range.invalid",
        createdAt: end,
      },
    ],
  });
  await prisma.interactionDaily.createMany({
    data: [
      {
        day: new Date("2000-02-27"),
        event: "search_click",
        target: "post:" + postId,
        count: 100,
      },
      {
        day: new Date("2000-02-28"),
        event: "search_click",
        target: "post:" + postId,
        count: 2,
      },
      {
        day: new Date("2000-03-01"),
        event: "search_click",
        target: "post:" + postId,
        count: 3,
      },
      {
        day: new Date("2000-03-02"),
        event: "search_click",
        target: "post:" + postId,
        count: 100,
      },
    ],
  });

  try {
    const response = await stats(
      req("/api/analytics/stats?start=2000-02-28&end=2000-03-01"),
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.period).toEqual({ pv: 3, uv: 2 });
    expect(data.trend).toEqual([
      { date: "2000-02-28", pv: 1, uv: 1 },
      { date: "2000-02-29", pv: 0, uv: 0 },
      { date: "2000-03-01", pv: 2, uv: 2 },
    ]);
    expect(data.topPages).toContainEqual(
      expect.objectContaining({
        path: "/posts/" + slug,
        count: 3,
        title: "Report range fixture",
      }),
    );
    expect(data.referrers).toEqual([{ host: "range.invalid", count: 3 }]);
    expect(data.interactions.search_click).toBe(5);
    const overviewResponse = await overview(
      req("/api/admin/content-stats?start=2000-02-28&end=2000-03-01"),
    );
    expect(overviewResponse.status).toBe(200);
    const { data: contentData } = await overviewResponse.json();
    expect(contentData.createdTimeline).toHaveLength(12);
    expect(
      contentData.createdTimeline.find(
        (r: { date: string; kind: string }) =>
          r.date === "2000-02-28" && r.kind === "post",
      ).count,
    ).toBe(1);
    expect(
      contentData.publishedTimeline.find(
        (r: { date: string; kind: string }) =>
          r.date === "2000-03-01" && r.kind === "post",
      ).count,
    ).toBe(1);
    expect(
      contentData.counts.find((r: { kind: string }) => r.kind === "post").total,
    ).toBeGreaterThanOrEqual(1);
    expect(
      (await stats(req("/api/analytics/stats?start=2000-02-28"))).status,
    ).toBe(400);
    expect(
      (
        await overview(
          req("/api/admin/content-stats?start=2000-03-01&end=2000-02-28"),
        )
      ).status,
    ).toBe(400);
  } finally {
    await prisma.pageView.deleteMany({
      where: { visitorId: { in: [visitor, other] } },
    });
    if (postId) {
      await prisma.interactionDaily.deleteMany({
        where: { target: "post:" + postId },
      });
      await prisma.post.delete({ where: { id: postId } });
    }
    await redis.del(...cacheKeys);
  }
});
