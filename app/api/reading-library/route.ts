import { body, endpoint, json, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
export const POST = endpoint(async (req: Request) => {
  const value = await body(req);
  if (!Array.isArray(value.items) || value.items.length > 100)
    throw new ApiError(400, "INVALID_READING_REFS");
  const posts: number[] = [],
    notes: number[] = [];
  for (const ref of value.items) {
    if (
      !ref ||
      typeof ref !== "object" ||
      !["post", "note"].includes(ref.kind) ||
      !Number.isSafeInteger(ref.id) ||
      ref.id < 1
    )
      throw new ApiError(400, "INVALID_READING_REFS");
    (ref.kind === "post" ? posts : notes).push(ref.id);
  }
  const select = {
    id: true,
    title: true,
    slug: true,
    excerpt: true,
    publishedAt: true,
  };
  const [postRows, noteRows] = await Promise.all([
    prisma.post.findMany({
      where: { id: { in: posts }, published: true },
      select,
    }),
    prisma.note.findMany({
      where: { id: { in: notes }, published: true },
      select,
    }),
  ]);
  return json({
    ok: true,
    data: [
      ...postRows.map((r) => ({ ...r, kind: "post" })),
      ...noteRows.map((r) => ({ ...r, kind: "note" })),
    ],
  });
});
