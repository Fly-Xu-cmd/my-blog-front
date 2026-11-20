import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { GET, POST, PATCH } from "@/app/api/feedback/route";
import {
  GET as settingsGet,
  PUT as settingsPut,
} from "@/app/api/feedback-settings/route";
import { feedbackLimit } from "@/lib/feedback";
let publicId: number, privateId: number;
const marker = randomUUID(),
  keys: string[] = [];
const headers = () => ({
  Authorization:
    "Bearer " + jwt.sign({ username: "test-admin" }, process.env.JWT_SECRET!),
  "Content-Type": "application/json",
});
const submission = (extra: Record<string, unknown> = {}, ip = "192.0.2.10") =>
  new Request("http://local/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": ip },
    body: JSON.stringify({
      resource: "post",
      contentId: publicId,
      type: "CORRECTION",
      message: marker + " <script>private</script>",
      contact: "reader@example.com",
      submissionId: randomUUID(),
      ...extra,
    }),
  });
beforeAll(async () => {
  expect(process.env.DATABASE_URL).toContain(":13316/blog_test");
  publicId = (
    await prisma.post.create({
      data: {
        slug: randomUUID(),
        title: "Feedback public",
        content: "body",
        published: true,
      },
    })
  ).id;
  privateId = (
    await prisma.post.create({
      data: {
        slug: randomUUID(),
        title: "Feedback private",
        content: "secret",
      },
    })
  ).id;
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  await prisma.feedback.deleteMany({
    where: { message: { contains: marker } },
  });
  await prisma.post.deleteMany({
    where: { id: { in: [publicId, privateId] } },
  });
  for (const ip of ["192.0.2.10", "192.0.2.11"])
    keys.push("feedback:rate:" + createHash("sha256").update(ip).digest("hex"));
  await redis.del(...keys);
  await redis.quit();
  await prisma.$disconnect();
});
it("private inbox and management settings reject anonymous identity before database", async () => {
  const read = vi.spyOn(prisma.feedback, "findMany"),
    write = vi.spyOn(prisma.feedback, "update");
  expect((await GET(new Request("http://local/api/feedback"))).status).toBe(
    401,
  );
  expect(
    (
      await PATCH(
        new Request("http://local/api/feedback", {
          method: "PATCH",
          body: "{}",
        }),
      )
    ).status,
  ).toBe(401);
  expect(
    (
      await settingsGet(
        new Request("http://local/api/feedback-settings?scope=admin"),
      )
    ).status,
  ).toBe(401);
  expect(
    (
      await settingsPut(
        new Request("http://local/api/feedback-settings", {
          method: "PUT",
          body: "{}",
        }),
      )
    ).status,
  ).toBe(401);
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});
it("same-key concurrent submissions create one private record and mismatched replay conflicts", async () => {
  vi.stubEnv("TRUST_PROXY", "true");
  vi.stubEnv("FEEDBACK_RATE_LIMIT", "100");
  const submissionId = randomUUID();
  const results = await Promise.all([
    POST(submission({ submissionId })),
    POST(submission({ submissionId })),
  ]);
  expect(results.every((r) => r.status === 200)).toBe(true);
  expect(await prisma.feedback.count({ where: { submissionId } })).toBe(1);
  expect(
    (await POST(submission({ submissionId, message: marker + " changed" })))
      .status,
  ).toBe(409);
  expect((await POST(submission({ contentId: privateId }))).status).toBe(404);
  const inbox = await GET(
    new Request("http://local/api/feedback?status=NEW", { headers: headers() }),
  );
  expect(inbox.headers.get("cache-control")).toBe("no-store");
  const rows = (await inbox.json()).data;
  const row = rows.find((r: { message: string }) => r.message.includes(marker));
  expect(row.contact).toBe("reader@example.com");
  expect(row.source).toMatchObject({
    id: publicId,
    title: "Feedback public",
    published: true,
  });
  expect(row.source.url).toContain("/posts/");
  expect(row).not.toHaveProperty("payloadHash");
  expect(
    (
      await PATCH(
        new Request("http://local/api/feedback", {
          method: "PATCH",
          headers: headers(),
          body: JSON.stringify({ id: row.id, status: "RESOLVED" }),
        }),
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await (
        await settingsGet(new Request("http://local/api/feedback-settings"))
      ).json()
    ).data,
  ).not.toHaveProperty("revision");
});
it("body size, origin, address and resource validation reject unsafe submissions", async () => {
  vi.stubEnv("TRUST_PROXY", "true");
  vi.stubEnv("FEEDBACK_RATE_LIMIT", "100");
  for (const value of [
    { contact: "a@b.com?x" },
    { message: " " },
    { resource: "dynamic" },
    { contentId: 0 },
    { submissionId: "bad" },
  ])
    expect((await POST(submission(value))).status).toBe(400);
  expect((await POST(submission({ message: "x".repeat(9000) }))).status).toBe(
    413,
  );
  const cross = submission();
  cross.headers.set("Origin", "https://other.invalid");
  expect((await POST(cross)).status).toBe(403);
  expect(
    (
      await settingsPut(
        new Request("http://local/api/feedback-settings", {
          method: "PUT",
          headers: headers(),
          body: JSON.stringify({
            githubUrl: "javascript:alert(1)",
            revision: 0,
          }),
        }),
      )
    ).status,
  ).toBe(400);
});
it("atomic limiter is bounded and Redis failure cannot fall through to database writes", async () => {
  vi.stubEnv("TRUST_PROXY", "true");
  vi.stubEnv("FEEDBACK_RATE_LIMIT", "1");
  await feedbackLimit(submission({}, "192.0.2.11"));
  const blocked = await POST(submission({}, "192.0.2.11"));
  expect(blocked.status).toBe(429);
  expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  vi.spyOn(redis, "eval").mockRejectedValue(
    new Error("private redis credentials"),
  );
  const create = vi.spyOn(prisma.feedback, "create");
  const failed = await POST(submission());
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain("credentials");
  expect(create).not.toHaveBeenCalled();
});
