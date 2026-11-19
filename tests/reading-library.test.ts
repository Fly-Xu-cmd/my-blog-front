import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/reading-library/route";
let publishedId: number, privateId: number;
const req = (items: unknown) =>
  new Request("http://local/api/reading-library", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
beforeAll(async () => {
  expect(process.env.DATABASE_URL).toContain(":13316/blog_test");
  publishedId = (
    await prisma.post.create({
      data: {
        title: "Library public",
        slug: randomUUID(),
        content: "large body",
        published: true,
      },
    })
  ).id;
  privateId = (
    await prisma.post.create({
      data: {
        title: "Library private",
        slug: randomUUID(),
        content: "secret",
        published: false,
      },
    })
  ).id;
});
afterAll(async () => {
  await prisma.post.deleteMany({
    where: { id: { in: [publishedId, privateId] } },
  });
  await prisma.$disconnect();
});
it("only currently public summaries are returned for browser references", async () => {
  const response = await POST(
    req([
      { kind: "post", id: publishedId },
      { kind: "post", id: privateId },
    ]),
  );
  expect(response.headers.get("cache-control")).toBe("no-store");
  const rows = (await response.json()).data;
  expect(rows).toHaveLength(1);
  expect(rows[0]).not.toHaveProperty("content");
  expect(rows[0].id).toBe(publishedId);
  await prisma.post.update({
    where: { id: publishedId },
    data: { published: false },
  });
  expect(
    (await (await POST(req([{ kind: "post", id: publishedId }]))).json()).data,
  ).toEqual([]);
});
it("invalid and unbounded requests fail before queries", async () => {
  const read = vi.spyOn(prisma.post, "findMany");
  for (const items of [
    null,
    [{ kind: "post", id: -1 }],
    [{ kind: "admin", id: 1 }],
    Array.from({ length: 101 }, () => ({ kind: "post", id: 1 })),
  ])
    expect((await POST(req(items))).status).toBe(400);
  expect(read).not.toHaveBeenCalled();
  read.mockRestore();
});
