import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/search/route";
const ids: number[] = [],
  noteIds: number[] = [];
const marker = randomUUID();
const search = (q: string, type = "all", current = 1) =>
  GET(
    new Request(
      "http://local/api/search?" +
        new URLSearchParams({
          q,
          type,
          current: String(current),
          pageSize: "2",
        }),
    ),
  );
beforeAll(async () => {
  expect(process.env.DATABASE_URL).toBe(
    "mysql://root:local-test-only@127.0.0.1:13316/blog_test",
  );
  for (const published of [true, true, false])
    ids.push(
      (
        await prisma.post.create({
          data: {
            title: marker + " 标题 %_",
            content: "before " + marker + " body " + "x".repeat(4000),
            slug: randomUUID(),
            published,
            publishedAt: new Date(),
          },
        })
      ).id,
    );
  for (const kind of ["TECH", "ESSAY"] as const)
    noteIds.push(
      (
        await prisma.note.create({
          data: {
            title: marker + " note",
            syncId: randomUUID(),
            content: marker + " **正文**",
            slug: randomUUID(),
            published: true,
            publishedAt: new Date(),
            kind,
          },
        })
      ).id,
    );
  noteIds.push(
    (
      await prisma.note.create({
        data: {
          title: marker + " PRIVATE",
          syncId: randomUUID(),
          content: marker,
          slug: randomUUID(),
          published: false,
        },
      })
    ).id,
  );
});
afterAll(async () => {
  await prisma.post.deleteMany({ where: { id: { in: ids } } });
  await prisma.note.deleteMany({ where: { id: { in: noteIds } } });
  await prisma.$disconnect();
});
it("paginates the combined public set consistently and returns bounded snippets", async () => {
  const first = await (await search(marker)).json(),
    second = await (await search(marker, "all", 2)).json();
  expect(first.total).toBe(4);
  expect(first.groups).toEqual({ post: 2, TECH: 1, ESSAY: 1 });
  expect(second.total).toBe(4);
  expect(first.pages).toBe(2);
  const rows = [...first.data, ...second.data];
  expect(
    new Set(rows.map((r: { kind: string; id: number }) => r.kind + r.id)).size,
  ).toBe(4);
  for (const row of rows) {
    expect(row).not.toHaveProperty("content");
    expect(row).not.toHaveProperty("contentWindow");
    expect(row.matchOffset).toBeGreaterThanOrEqual(0);
    expect(row.snippet.length).toBeLessThanOrEqual(201);
    expect(row.title).not.toContain("PRIVATE");
  }
  expect((await (await search(marker, "post")).json()).total).toBe(2);
  expect((await (await search(marker, "TECH")).json()).total).toBe(1);
  expect((await (await search(marker, "ESSAY")).json()).total).toBe(1);
});
it("literal punctuation never becomes wildcard/SQL and invalid input is explicit", async () => {
  expect((await (await search("%_")).json()).total).toBeGreaterThanOrEqual(2);
  expect((await (await search(marker + "' OR 1=1 --")).json()).total).toBe(0);
  expect((await search("x".repeat(101))).status).toBe(400);
  expect((await search(marker, "unknown")).status).toBe(400);
  expect((await search(marker, "all", 0)).status).toBe(400);
  expect(
    (await GET(new Request("http://local/api/search?q=x&scope=admin"))).status,
  ).toBe(401);
  expect((await (await search("")).json()).total).toBe(0);
});
