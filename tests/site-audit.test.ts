import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { defaultSite } from "@/lib/site-default";
test("site image audit is read-only and excludes contact details and signed query strings", async () => {
  expect(process.env.DATABASE_URL).toContain(":13316/blog_test");
  const original = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  const fields = {
    ...defaultSite,
    name: "private audit label",
    email: "never-print@example.com",
    avatar: "https://old.example/uploads/avatar.png?signature=secret",
  };
  const fixture = await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, fields },
    update: { fields },
  });
  const folder = await mkdtemp(join(tmpdir(), "blog-site-audit-"));
  try {
    const output = join(folder, "audit.json");
    const result = await promisify(execFile)(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/audit-site-references.ts",
        "--output=" + output,
      ],
      {
        env: { ...process.env, AUDIT_DATABASE_URL: process.env.DATABASE_URL },
        timeout: 10000,
      },
    );
    const raw = await readFile(output, "utf8");
    expect(JSON.parse(raw)).toMatchObject({
      complete: true,
      scanned: 1,
      references: [{ id: 1, paths: ["/uploads/avatar.png"] }],
    });
    for (const secret of [
      "private audit label",
      "never-print",
      "signature",
      "secret",
    ]) {
      expect(raw).not.toContain(secret);
      expect(result.stdout + result.stderr).not.toContain(secret);
    }
    expect(await prisma.siteSettings.findUnique({ where: { id: 1 } })).toEqual(
      fixture,
    );
  } finally {
    await prisma.siteSettings.deleteMany({ where: { id: 1 } });
    if (original)
      await prisma.siteSettings.create({
        data: { ...original, fields: original.fields as Prisma.InputJsonValue },
      });
    await rm(folder, { recursive: true });
    await prisma.$disconnect();
  }
});
