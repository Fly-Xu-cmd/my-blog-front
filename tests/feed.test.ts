import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ posts: vi.fn(), notes: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { post: { findMany: db.posts }, note: { findMany: db.notes } },
}));
import { readFeedEntries } from "@/lib/feed";

const entry = (slug: string, date: string) => ({
  slug,
  title: slug,
  excerpt: "摘要",
  publishedAt: new Date(date),
});
beforeEach(() => {
  db.posts.mockReset();
  db.notes.mockReset();
});
describe("shared public feed", () => {
  it("applies public visibility and merges posts and notes in stable publication order", async () => {
    db.posts.mockResolvedValue([
      entry("older", "2026-11-16"),
      entry("same-post", "2026-11-18"),
    ]);
    db.notes.mockResolvedValue([entry("same-note", "2026-11-18")]);
    const rows = await readFeedEntries();
    expect(rows.map((p) => p.path)).toEqual([
      "/notes/same-note",
      "/posts/same-post",
      "/posts/older",
    ]);
    expect(rows.map((p) => p.kind)).toEqual(["note", "post", "post"]);
    for (const query of [db.posts, db.notes]) {
      expect(query).toHaveBeenCalledWith({
        where: { published: true },
        select: { slug: true, title: true, excerpt: true, publishedAt: true },
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        take: 50,
      });
    }
    expect(rows[0].url).toMatch(/\/notes\/same-note$/);
  });
  it("limits the combined feed to 50 entries rather than 50 of each kind", async () => {
    db.posts.mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => entry("p-" + i, "2026-11-17")),
    );
    db.notes.mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => entry("n-" + i, "2026-11-18")),
    );
    const rows = await readFeedEntries();
    expect(rows).toHaveLength(50);
    expect(rows.every((p) => p.kind === "note")).toBe(true);
  });
  it("preserves dependency failures for each caller to handle", async () => {
    db.posts.mockRejectedValue(new Error("isolated failure"));
    db.notes.mockResolvedValue([]);
    await expect(readFeedEntries()).rejects.toThrow("isolated failure");
  });
});
