import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/posts/route";
import { PUT, DELETE } from "@/app/api/posts/[slug]/route";
import { GET as versions } from "@/app/api/posts/[slug]/versions/route";
import { GET as version } from "@/app/api/posts/[slug]/versions/[revision]/route";
import { POST as reorder } from "@/app/api/series/[id]/reorder/route";
import { DELETE as deleteCategory } from "@/app/api/categories/route";
import { PUT as renameTag, DELETE as deleteTag } from "@/app/api/tags/route";

const context = (slug: string) => ({ params: Promise.resolve({ slug }) });
const request = (
  method: string,
  data?: unknown,
  auth = true,
  key = randomUUID(),
) =>
  new Request("http://localhost/api/posts", {
    method,
    headers: {
      ...(auth
        ? {
            Authorization:
              "Bearer " +
              jwt.sign({ username: "test-admin" }, process.env.JWT_SECRET!),
          }
        : {}),
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
const ids: number[] = [];
let seriesId: number;
beforeAll(async () => {
  expect(process.env.DATABASE_URL).toContain(":13316/blog_test");
});
afterAll(async () => {
  await prisma.postRevision.deleteMany({ where: { postId: { in: ids } } });
  await prisma.post.deleteMany({ where: { id: { in: ids } } });
  if (seriesId) await prisma.series.delete({ where: { id: seriesId } });
  await prisma.$disconnect();
});
test("history and mutations reject anonymous identity before any database access", async () => {
  const read = vi.spyOn(prisma.post, "findUnique");
  const tx = vi.spyOn(prisma, "$transaction");
  try {
    expect(
      (await versions(request("GET", undefined, false), context("private")))
        .status,
    ).toBe(401);
    expect(
      (
        await version(request("GET", undefined, false), {
          params: Promise.resolve({ slug: "private", revision: "1" }),
        })
      ).status,
    ).toBe(401);
    expect(
      (await PUT(request("PUT", {}, false), context("private"))).status,
    ).toBe(401);
    expect(read).not.toHaveBeenCalled();
    expect(tx).not.toHaveBeenCalled();
  } finally {
    read.mockRestore();
    tx.mockRestore();
  }
});
test("creation snapshot is atomic with idempotency, concurrent stale updates only commit once, restoration preserves publication and URL", async () => {
  const key = randomUUID(),
    slug = "version-" + randomUUID();
  const body = {
    title: "Original",
    content: "old /uploads/a.jpg",
    slug,
    published: false,
  };
  const created = await (await POST(request("POST", body, true, key))).json();
  expect(created.ok).toBe(true);
  ids.push(created.data.id);
  expect((await POST(request("POST", body, true, key))).status).toBe(200);
  expect(
    await prisma.postRevision.count({ where: { postId: created.data.id } }),
  ).toBe(1);
  const results = await Promise.all(
    ["A", "B"].map((title) =>
      PUT(
        request("PUT", { revision: 1, title, content: title }),
        context(slug),
      ),
    ),
  );
  expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(
    await prisma.postRevision.count({ where: { postId: created.data.id } }),
  ).toBe(2);
  const current = await prisma.post.findUniqueOrThrow({ where: { slug } });
  expect(current.revision).toBe(2);
  const response = await version(request("GET"), {
    params: Promise.resolve({ slug, revision: "1" }),
  });
  expect(response.headers.get("cache-control")).toBe("no-store");
  const snapshot = (await response.json()).data.snapshot;
  expect(snapshot).not.toHaveProperty("slug");
  expect(snapshot).not.toHaveProperty("published");
  expect(snapshot).not.toHaveProperty("seriesId");
  const restored = await PUT(
    request("PUT", { ...snapshot, revision: current.revision }),
    context(slug),
  );
  expect(restored.status).toBe(200);
  const row = await prisma.post.findUniqueOrThrow({ where: { slug } });
  expect(row.content).toBe(body.content);
  expect(row.published).toBe(false);
  expect(row.publishedAt).toBeNull();
  const history = await versions(
    new Request("http://localhost/api/posts/versions?current=1&pageSize=2", {
      headers: request("GET").headers,
    }),
    context(slug),
  );
  const list = await history.json();
  expect(list.total).toBe(3);
  expect(list.data).toHaveLength(2);
  expect(JSON.stringify(list)).not.toContain(body.content);
  expect((await DELETE(request("DELETE"), context(slug))).status).toBe(200);
  expect((await versions(request("GET"), context(slug))).status).toBe(404);
  expect(
    await prisma.postRevision.count({ where: { postId: created.data.id } }),
  ).toBe(3);
});
test("first editing a legacy article records its baseline and series reordering invalidates stale editors", async () => {
  const series = await prisma.series.create({
    data: { name: randomUUID(), slug: "series-" + randomUUID() },
  });
  seriesId = series.id;
  const old = await prisma.post.create({
    data: {
      title: "Legacy",
      slug: "legacy-" + randomUUID(),
      content: "Before",
      published: true,
      publishedAt: new Date("2020-01-01"),
      seriesId,
      seriesOrder: 1,
    },
  });
  ids.push(old.id);
  expect(
    (
      await PUT(
        request("PUT", { revision: 1, content: "After" }),
        context(old.slug),
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await prisma.postRevision.findUniqueOrThrow({
        where: { postId_revision: { postId: old.id, revision: 1 } },
      })
    ).snapshot,
  ).toMatchObject({ content: "Before" });
  expect(
    (
      await reorder(request("POST", { postIds: [old.id] }), {
        params: Promise.resolve({ id: String(seriesId) }),
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await PUT(
        request("PUT", { revision: 2, content: "Stale" }),
        context(old.slug),
      )
    ).status,
  ).toBe(409);
  const current = await prisma.post.findUniqueOrThrow({
    where: { id: old.id },
  });
  expect(current.publishedAt).toEqual(old.publishedAt);
  expect(current.content).toBe("After");
});
test("taxonomy changes invalidate stale editors so saving cannot recreate a renamed or deleted tag", async () => {
  const category = await prisma.category.create({
    data: { name: randomUUID() },
  });
  const tag = await prisma.tag.create({ data: { name: randomUUID() } });
  const post = await prisma.post.create({
    data: {
      title: "Taxonomy",
      slug: "taxonomy-" + randomUUID(),
      content: "body",
      categoryId: category.id,
      tags: { create: { tagId: tag.id } },
    },
  });
  ids.push(post.id);
  const renamed = randomUUID();
  expect(
    (await renameTag(request("PUT", { name: tag.name, newName: renamed })))
      .status,
  ).toBe(200);
  expect(
    (
      await PUT(
        request("PUT", { revision: 1, tags: [tag.name] }),
        context(post.slug),
      )
    ).status,
  ).toBe(409);
  expect(await prisma.tag.count({ where: { name: tag.name } })).toBe(0);
  expect((await deleteTag(request("DELETE", { name: renamed }))).status).toBe(
    200,
  );
  expect(
    (await deleteCategory(request("DELETE", { name: category.name }))).status,
  ).toBe(200);
  expect(
    (
      await PUT(
        request("PUT", { revision: 2, title: "stale" }),
        context(post.slug),
      )
    ).status,
  ).toBe(409);
  expect(
    (await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).revision,
  ).toBe(4);
});
