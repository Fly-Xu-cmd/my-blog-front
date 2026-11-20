import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { POST } from "@/app/api/analytics/interaction/route";
import { GET as stats } from "@/app/api/analytics/stats/route";
import { GET as overview } from "@/app/api/admin/content-stats/route";
import { interactionDay, recordInteraction } from "@/lib/interactions";
let id: number, hiddenId: number;
const visitors: string[] = [];
const send = (value: unknown, extra: Record<string, string> = {}) =>
  POST(
    new Request("http://local/api/analytics/interaction", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extra },
      body: JSON.stringify(value),
    }),
  );
beforeAll(async () => {
  expect(process.env.DATABASE_URL).toContain(":13316/blog_test");
  for (const published of [true, false]) {
    const row = await prisma.post.create({
      data: {
        title: "Interaction fixture",
        content: "body",
        slug: randomUUID(),
        published,
      },
    });
    if (published) id = row.id;
    else hiddenId = row.id;
  }
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  await prisma.interactionDaily.deleteMany({
    where: { target: { in: ["post:" + id, "post:" + hiddenId] } },
  });
  await prisma.post.deleteMany({ where: { id: { in: [id, hiddenId] } } });
  await redis.del(
    "analytics:rate:interaction:untrusted",
    "analytics:rate:interaction:192.0.2.82",
  );
  for (const visitor of visitors)
    await redis.del(
      "interaction:dedup:" + visitor + ":search_click:post:" + id,
    );
  await redis.quit();
  await prisma.$disconnect();
});
it("parallel distinct clicks count atomically while the same browser double click is deduplicated", async () => {
  const batch = Array.from({ length: 12 }, () => randomUUID());
  visitors.push(...batch);
  await Promise.all(
    batch.map((visitorId) =>
      recordInteraction({
        event: "search_click",
        target: "post:" + id,
        visitorId,
      }),
    ),
  );
  const before = await prisma.interactionDaily.findUnique({
    where: {
      day_event_target: {
        day: interactionDay(),
        event: "search_click",
        target: "post:" + id,
      },
    },
  });
  expect(before?.count).toBe(12);
  await Promise.all(
    batch.map((visitorId) =>
      recordInteraction({
        event: "search_click",
        target: "post:" + id,
        visitorId,
      }),
    ),
  );
  expect(
    (
      await prisma.interactionDaily.findUnique({
        where: {
          day_event_target: {
            day: interactionDay(),
            event: "search_click",
            target: "post:" + id,
          },
        },
      })
    )?.count,
  ).toBe(12);
});
it("public endpoint rejects private content, free-form targets, hostile origin and oversized JSON", async () => {
  const visitorId = randomUUID();
  visitors.push(visitorId);
  expect(
    (
      await send({
        event: "search_click",
        target: "post:" + hiddenId,
        visitorId,
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await send({
        event: "search",
        target: "private search phrase",
        visitorId,
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await send(
        { event: "search", target: "all", visitorId },
        { Origin: "https://other.invalid" },
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await send({
        event: "search",
        target: "all",
        visitorId,
        body: "x".repeat(3000),
      })
    ).status,
  ).toBe(413);
  expect(
    (await send({ event: "search", target: "all", visitorId: "bad" })).status,
  ).toBe(400);
});
it("rate limit and Redis failures return explicit errors without database writes", async () => {
  vi.stubEnv("TRUST_PROXY", "true");
  vi.stubEnv("INTERACTION_RATE_LIMIT", "1");
  const visitorId = randomUUID();
  visitors.push(visitorId);
  const value = { event: "search_click", target: "post:" + id, visitorId };
  expect((await send(value, { "x-real-ip": "192.0.2.82" })).status).toBe(200);
  expect((await send(value, { "x-real-ip": "192.0.2.82" })).status).toBe(429);
  vi.spyOn(redis, "eval").mockRejectedValue(
    new Error("private dependency details"),
  );
  const write = vi.spyOn(prisma, "$executeRaw");
  const failed = await send(value, { "x-real-ip": "192.0.2.83" });
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain("dependency details");
  expect(write).not.toHaveBeenCalled();
});
it("admin overview and analytics reject anonymous users before cache or database access", async () => {
  const cache = vi.spyOn(redis, "get"),
    query = vi.spyOn(prisma, "$queryRaw");
  expect(
    (await stats(new Request("http://local/api/analytics/stats"))).status,
  ).toBe(401);
  expect(
    (await overview(new Request("http://local/api/admin/content-stats")))
      .status,
  ).toBe(401);
  expect(cache).not.toHaveBeenCalled();
  expect(query).not.toHaveBeenCalled();
});
