import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { defaultAbout } from "@/lib/about-default";
import { GET, PUT } from "@/app/api/about/route";

const payload = {
  title: "关于测试",
  subtitle: "测试介绍",
  content: "正文\n\n  保留缩进",
};
const request = (data: unknown, authenticated = true) =>
  new Request("http://localhost/api/about", {
    method: "PUT",
    headers: authenticated
      ? {
          Authorization:
            "Bearer " +
            jwt.sign({ username: "test-admin" }, process.env.JWT_SECRET!),
          "Content-Type": "application/json",
        }
      : {},
    body: JSON.stringify(data),
  });
let original: Awaited<ReturnType<typeof prisma.aboutPage.findUnique>>;
beforeAll(async () => {
  expect(process.env.DATABASE_URL).toBe(
    "mysql://root:local-test-only@127.0.0.1:13316/blog_test",
  );
  original = await prisma.aboutPage.findUnique({ where: { id: 1 } });
  await prisma.aboutPage.deleteMany({ where: { id: 1 } });
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await prisma.aboutPage.deleteMany({ where: { id: 1 } });
  if (original) await prisma.aboutPage.create({ data: original });
  await prisma.$disconnect();
});

it("returns a default without writing, protects management reads and rejects writes before DB/body parsing", async () => {
  const write = vi.spyOn(prisma, "$transaction");
  const read = vi.spyOn(prisma.aboutPage, "findUnique");
  expect(
    (await GET(new Request("http://localhost/api/about?scope=admin"))).status,
  ).toBe(401);
  expect((await PUT(request({ revision: 0 }, false))).status).toBe(401);
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  const response = await GET(new Request("http://localhost/api/about"));
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect((await response.json()).data).toEqual(defaultAbout);
  expect(write).not.toHaveBeenCalled();
});

it("rejects malformed fields and revisions without writes", async () => {
  const write = vi.spyOn(prisma, "$transaction");
  for (const invalid of [
    { title: "" },
    { title: "a".repeat(81) },
    { subtitle: null },
    { content: " " },
    { content: "a".repeat(100001) },
    { revision: -1 },
    { revision: "0" },
    { revision: 1.5 },
    { revision: 2147483647 },
  ])
    expect(
      (await PUT(request({ ...payload, revision: 0, ...invalid }))).status,
    ).toBe(400);
  expect(write).not.toHaveBeenCalled();
});

it("concurrent first saves and revision updates have one winner; stale writes preserve saved data", async () => {
  const responses = await Promise.all([
    PUT(request({ ...payload, revision: 0 })),
    PUT(request({ ...payload, revision: 0 })),
  ]);
  expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
  expect(await prisma.aboutPage.count()).toBe(1);
  const successful = await responses.find((res) => res.status === 200)!.json();
  expect(successful.data).toMatchObject({ ...payload, revision: 1 });
  const updates = await Promise.all(
    ["A", "B"].map((title) => PUT(request({ ...payload, title, revision: 1 }))),
  );
  expect(updates.map((res) => res.status).sort()).toEqual([200, 409]);
  const row = await prisma.aboutPage.findUniqueOrThrow({ where: { id: 1 } });
  expect(row.revision).toBe(2);
  const conflict = await PUT(
    request({ ...payload, title: "stale", revision: 1 }),
  );
  expect((await conflict.json()).code).toBe("ABOUT_VERSION_CONFLICT");
  expect(await prisma.aboutPage.findUnique({ where: { id: 1 } })).toEqual(row);
  const adminRead = await GET(
    new Request("http://localhost/api/about?scope=admin", {
      headers: request({}, true).headers,
    }),
  );
  expect((await adminRead.json()).data.revision).toBe(2);
  const publicRead = await GET(new Request("http://localhost/api/about"));
  const publicData = (await publicRead.json()).data;
  expect(publicData.title).toBe(row.title);
  expect(publicData).not.toHaveProperty("revision");
  expect(publicData).not.toHaveProperty("updatedAt");
});

it("database failures return 503, do not leak errors or substitute defaults, and do not retry writes", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(prisma.aboutPage, "findUnique").mockRejectedValue(
    new Error("private SQL credentials"),
  );
  const response = await GET(new Request("http://localhost/api/about"));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private");
  const write = vi
    .spyOn(prisma, "$transaction")
    .mockRejectedValue(new Error("private SQL credentials"));
  const failed = await PUT(request({ ...payload, revision: 2 }));
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain("private");
  expect(write).toHaveBeenCalledTimes(1);
});
