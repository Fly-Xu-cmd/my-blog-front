import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { defaultSite } from "@/lib/site-default";
import type { Prisma } from "@prisma/client";
import { GET, PUT } from "@/app/api/site-settings/route";

const request = (data: unknown, authenticated = true) =>
  new Request("http://localhost/api/site-settings", {
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
let original: Awaited<ReturnType<typeof prisma.siteSettings.findUnique>>;
beforeAll(async () => {
  expect(process.env.DATABASE_URL).toBe(
    "mysql://root:local-test-only@127.0.0.1:13316/blog_test",
  );
  original = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  await prisma.siteSettings.deleteMany({ where: { id: 1 } });
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await prisma.siteSettings.deleteMany({ where: { id: 1 } });
  if (original)
    await prisma.siteSettings.create({
      data: { ...original, fields: original.fields as Prisma.InputJsonValue },
    });
  await prisma.$disconnect();
});
it("protects management before reads and returns public defaults without writes", async () => {
  const read = vi.spyOn(prisma.siteSettings, "findUnique");
  const write = vi.spyOn(prisma, "$transaction");
  expect(
    (await GET(new Request("http://localhost/api/site-settings?scope=admin")))
      .status,
  ).toBe(401);
  expect((await PUT(request({}, false))).status).toBe(401);
  expect(read).not.toHaveBeenCalled();
  const result = await GET(new Request("http://localhost/api/site-settings"));
  expect(result.headers.get("cache-control")).toBe("no-store");
  expect((await result.json()).data).toEqual(defaultSite);
  expect(write).not.toHaveBeenCalled();
});
it("rejects unsafe addresses and malformed revisions without writes", async () => {
  const write = vi.spyOn(prisma, "$transaction");
  for (const invalid of [
    { name: "" },
    { name: "a".repeat(81) },
    { email: "a@b.com?subject=x" },
    { avatar: "javascript:alert(1)" },
    { github: "https://user:secret@example.com" },
    { wechatQr: "/imgs/../secret" },
    { qqQr: "//host/image" },
    { github: "data:text/html,x" },
    { homeIntro: null },
    { revision: "0" },
    { revision: -1 },
    { revision: 1.5 },
    { revision: 2147483647 },
  ])
    expect((await PUT(request({ revision: 0, ...invalid }))).status).toBe(400);
  expect(write).not.toHaveBeenCalled();
});
it("CAS has one winner, omitted fields remain and empty contacts hide entries", async () => {
  const first = await Promise.all([
    PUT(request({ name: "甲", revision: 0 })),
    PUT(request({ name: "乙", revision: 0 })),
  ]);
  expect(first.map((r) => r.status).sort()).toEqual([200, 409]);
  const originalSaved = (await first.find((r) => r.status === 200)!.json())
    .data;
  const updates = await Promise.all(
    ["A", "B"].map((name) =>
      PUT(
        request({
          name,
          revision: 1,
          email: "hello@example.com",
          wechatQr: "",
        }),
      ),
    ),
  );
  expect(updates.map((r) => r.status).sort()).toEqual([200, 409]);
  const saved = (await updates.find((r) => r.status === 200)!.json()).data;
  expect(saved.homeIntro).toBe(originalSaved.homeIntro);
  expect(saved.wechatQr).toBe("");
  expect(saved.revision).toBe(2);
  const stale = await PUT(request({ revision: 1, homeIntro: "过期输入" }));
  expect((await stale.json()).code).toBe("SITE_VERSION_CONFLICT");
  const publicData = (
    await (await GET(new Request("http://localhost/api/site-settings"))).json()
  ).data;
  expect(publicData.name).toBe(saved.name);
  expect(publicData).not.toHaveProperty("revision");
  expect(publicData).not.toHaveProperty("updatedAt");
});
it("dependency failures are explicit and do not expose errors or retry writes", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const transaction = vi
    .spyOn(prisma, "$transaction")
    .mockRejectedValue(new Error("private SQL credentials"));
  const failed = await PUT(request({ revision: 2 }));
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain("private");
  expect(transaction).toHaveBeenCalledTimes(1);
  vi.spyOn(prisma.siteSettings, "findUnique").mockRejectedValue(
    new Error("private SQL credentials"),
  );
  const result = await GET(new Request("http://localhost/api/site-settings"));
  expect(result.status).toBe(503);
  expect(await result.text()).not.toContain("private");
});
