import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { POST, PUT } from "@/app/api/series/route";
import { prisma } from "@/lib/prisma";

const ids: number[] = [];
const token = () => randomUUID().replaceAll("-", "");
const request = (data: unknown, method = "POST") =>
  new Request("http://localhost/api/series", {
    method,
    headers: {
      Authorization: `Bearer ${jwt.sign({ username: "test-admin" }, process.env.JWT_SECRET!)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
const create = async (data: unknown) => {
  const response = await POST(request(data));
  const result = await response.json();
  if (result.ok) ids.push(result.data.id);
  return { response, result };
};
beforeAll(() => {
  expect(process.env.DATABASE_URL).toContain("127.0.0.1:13316/blog_test");
});
afterEach(async () => {
  vi.restoreAllMocks();
  await prisma.series.deleteMany({ where: { id: { in: ids.splice(0) } } });
});
afterAll(() => prisma.$disconnect());

it("creates Chinese and mixed series paths from the name when slug is omitted", async () => {
  const suffix = token();
  const chinese = await create({ name: `博客工程实践 ${suffix}` });
  expect(chinese.response.status).toBe(200);
  expect(chinese.result.data.slug).toBe(`bo-ke-gong-cheng-shi-jian-${suffix}`);
  const mixed = await create({ name: `你好 React 19 ${suffix}` });
  expect(mixed.result.data.slug).toBe(`ni-hao-react-19-${suffix}`);
  expect(chinese.response.headers.get("Cache-Control")).toBe("no-store");
});

it("allocates a suffix for an occupied path but honors manual paths and their conflicts", async () => {
  const suffix = token();
  const slug = `bo-ke-${suffix}`;
  expect(
    (await create({ name: `occupied ${suffix}`, slug })).response.status,
  ).toBe(200);
  const automatic = await create({ name: `博客 ${suffix}` });
  expect(automatic.result.data.slug).toBe(`${slug}-2`);
  const manual = await create({
    name: `manual ${suffix}`,
    slug: `custom-${suffix}`,
  });
  expect(manual.result.data.slug).toBe(`custom-${suffix}`);
  const collision = await create({
    name: `conflict ${suffix}`,
    slug: `custom-${suffix}`,
  });
  expect(collision.response.status).toBe(409);
  expect(collision.result.code).toBe("SLUG_CONFLICT");
});

it("does not retry a series name conflict as a slug conflict", async () => {
  const suffix = token();
  const name = `重复名称 ${suffix}`;
  await create({ name, slug: `different-${suffix}` });
  const write = vi.spyOn(prisma.series, "create");
  const conflict = await create({ name });
  expect(conflict.response.status).toBe(409);
  expect(conflict.result.code).toBe("CONFLICT");
  expect(write).toHaveBeenCalledTimes(1);
});

it("keeps the original path after renaming and rejects an explicit path change", async () => {
  const suffix = token();
  const { result } = await create({ name: `系列 ${suffix}` });
  const { id, slug } = result.data;
  const renamed = await PUT(request({ id, name: `新名称 ${suffix}` }, "PUT"));
  expect(renamed.status).toBe(200);
  expect((await renamed.json()).data.slug).toBe(slug);
  const changed = await PUT(request({ id, slug: `changed-${suffix}` }, "PUT"));
  expect(changed.status).toBe(409);
  expect((await changed.json()).code).toBe("SLUG_IMMUTABLE");
  expect((await prisma.series.findUniqueOrThrow({ where: { id } })).slug).toBe(
    slug,
  );
});

it("rejects invalid paths and anonymous creation before database writes", async () => {
  const write = vi.spyOn(prisma.series, "create");
  const invalid = await create({ name: "invalid", slug: "../path" });
  expect(invalid.response.status).toBe(400);
  expect(invalid.result.code).toBe("INVALID_SLUG");
  const anonymous = await POST(
    new Request("http://localhost/api/series", {
      method: "POST",
      body: JSON.stringify({ name: "anonymous" }),
    }),
  );
  expect(anonymous.status).toBe(401);
  expect(write).not.toHaveBeenCalled();
});
