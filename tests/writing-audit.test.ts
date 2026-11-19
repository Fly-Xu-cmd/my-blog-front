import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { prisma } from "@/lib/prisma";

test("read-only audit includes deleted articles snapshots and excludes private prose and query credentials", async () => {
  expect(process.env.DATABASE_URL).toContain(":13316/blog_test");
  const fixture = await prisma.postRevision.create({
    data: {
      postId: 2147483646,
      revision: Date.now() % 2147483646,
      actor: "test",
      snapshot: {
        title: "never expose private title",
        content:
          "secret prose ![old](/uploads/private-audit.png?signature=never-print-this)",
        cover: null,
        excerpt: null,
      },
    },
  });
  const folder = await mkdtemp(join(tmpdir(), "blog-writing-audit-"));
  try {
    const output = join(folder, "audit.json");
    const result = await promisify(execFile)(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/audit-writing-references.ts",
        "--output=" + output,
      ],
      {
        env: { ...process.env, AUDIT_DATABASE_URL: process.env.DATABASE_URL },
        timeout: 10000,
      },
    );
    const raw = await readFile(output, "utf8");
    const report = JSON.parse(raw);
    expect(report.complete).toBe(true);
    expect(report.references).toContainEqual({
      id: fixture.id,
      postId: fixture.postId,
      revision: fixture.revision,
      paths: ["/uploads/private-audit.png"],
    });
    for (const secret of ["secret prose", "never expose", "never-print-this"]) {
      expect(raw).not.toContain(secret);
      expect(result.stdout + result.stderr).not.toContain(secret);
    }
    expect(
      (
        await prisma.postRevision.findUniqueOrThrow({
          where: { id: fixture.id },
        })
      ).snapshot,
    ).toEqual(fixture.snapshot);
  } finally {
    await prisma.postRevision.delete({ where: { id: fixture.id } });
    await rm(folder, { recursive: true });
    await prisma.$disconnect();
  }
});
