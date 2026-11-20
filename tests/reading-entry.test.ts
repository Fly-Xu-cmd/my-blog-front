import { beforeAll, afterAll, afterEach, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { GET, PUT } from "@/app/api/reading-entry/route";
import type { Prisma } from "@prisma/client";
let original: Awaited<ReturnType<typeof prisma.readingEntry.findUnique>>;
let postId: number, privateId: number, seriesId: number;
const req = (value: unknown, auth = true) =>
  new Request("http://local/api/reading-entry", {
    method: "PUT",
    headers: auth
      ? {
          Authorization:
            "Bearer " +
            jwt.sign({ username: "test-admin" }, process.env.JWT_SECRET!),
        }
      : {},
    body: JSON.stringify(value),
  });
beforeAll(async () => {
  expect(process.env.DATABASE_URL).toBe(
    "mysql://root:local-test-only@127.0.0.1:13316/blog_test",
  );
  original = await prisma.readingEntry.findUnique({ where: { id: 1 } });
  await prisma.readingEntry.deleteMany({ where: { id: 1 } });
  const series = await prisma.series.create({
    data: { name: "Reading test", slug: randomUUID() },
  });
  seriesId = series.id;
  const post = await prisma.post.create({
    data: {
      title: "PUBLIC_READING",
      content: "body",
      excerpt: "summary",
      slug: randomUUID(),
      published: true,
      seriesId,
      seriesOrder: 1,
    },
  });
  postId = post.id;
  const draft = await prisma.post.create({
    data: {
      title: "PRIVATE_READING",
      content: "private body",
      slug: randomUUID(),
    },
  });
  privateId = draft.id;
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await prisma.readingEntry.deleteMany({ where: { id: 1 } });
  if (original)
    await prisma.readingEntry.create({
      data: { ...original, fields: original.fields as Prisma.InputJsonValue },
    });
  await prisma.post.deleteMany({ where: { id: { in: [postId, privateId] } } });
  await prisma.series.delete({ where: { id: seriesId } });
  await prisma.$disconnect();
});
it("requires identity before DB, rejects private choices and invalid IDs", async () => {
  const read = vi.spyOn(prisma.readingEntry, "findUnique");
  expect(
    (await GET(new Request("http://local/api/reading-entry?scope=admin")))
      .status,
  ).toBe(401);
  expect((await PUT(req({}, false))).status).toBe(401);
  expect(read).not.toHaveBeenCalled();
  for (const invalid of [
    { featuredPostId: privateId },
    { startPostIds: [postId, postId] },
    { startPostIds: [null] },
    { recommendedSeriesIds: [0] },
    { revision: "0" },
  ]) {
    expect(
      (
        await PUT(
          req({
            featuredPostId: null,
            startPostIds: [],
            recommendedSeriesIds: [],
            revision: 0,
            ...invalid,
          }),
        )
      ).status,
    ).toBe(400);
  }
});
it("concurrent saves have one winner and only public summaries remain after hiding", async () => {
  const value = {
    featuredPostId: postId,
    startPostIds: [postId],
    recommendedSeriesIds: [seriesId],
    revision: 0,
  };
  const saves = await Promise.all([PUT(req(value)), PUT(req(value))]);
  expect(saves.map((r) => r.status).sort()).toEqual([200, 409]);
  let publicData = (
    await (await GET(new Request("http://local/api/reading-entry"))).json()
  ).data;
  expect(publicData.featured.id).toBe(postId);
  expect(publicData.featured).not.toHaveProperty("content");
  expect(publicData.series).toHaveLength(1);
  await prisma.post.update({
    where: { id: postId },
    data: { published: false },
  });
  publicData = (
    await (await GET(new Request("http://local/api/reading-entry"))).json()
  ).data;
  expect(publicData).toEqual({ featured: null, starts: [], series: [] });
  const conflict = await PUT(
    req({
      revision: 0,
      featuredPostId: null,
      startPostIds: [],
      recommendedSeriesIds: [],
    }),
  );
  expect(conflict.status).toBe(409);
  expect((await conflict.json()).code).toBe("READING_VERSION_CONFLICT");
});
