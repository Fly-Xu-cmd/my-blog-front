import { createHash } from "node:crypto";
import {
  admin,
  ApiError,
  body,
  endpoint,
  idField,
  json,
  pagination,
  textField,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { feedbackBody, feedbackLimit } from "@/lib/feedback";
import { getSiteUrl } from "@/lib/seo";
export const POST = endpoint(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin && origin !== getSiteUrl())
    throw new ApiError(403, "INVALID_ORIGIN");
  const value = await feedbackBody(req);
  await feedbackLimit(req);
  if (value.website) return json({ ok: true });
  if (
    typeof value.submissionId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.submissionId,
    )
  )
    throw new ApiError(400, "INVALID_SUBMISSION_ID");
  const resource = value.resource;
  if (resource !== "post" && resource !== "note")
    throw new ApiError(400, "INVALID_RESOURCE");
  const contentId = idField(value.contentId);
  if (!contentId) throw new ApiError(400, "INVALID_ID");
  const type = value.type ?? "CORRECTION";
  if (!["CORRECTION", "QUESTION", "OTHER"].includes(type as string))
    throw new ApiError(400, "INVALID_FEEDBACK_TYPE");
  const message = textField(value.message, 2000, true)!,
    contact = textField(value.contact, 160) ?? "";
  if (contact && !/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(contact))
    throw new ApiError(400, "INVALID_CONTACT");
  const payloadHash = createHash("sha256")
    .update(JSON.stringify({ resource, contentId, type, message, contact }))
    .digest("hex");
  const where = { submissionId: value.submissionId.toLowerCase() };
  const previous = await prisma.feedback.findUnique({
    where,
    select: { payloadHash: true },
  });
  if (previous) {
    if (previous.payloadHash !== payloadHash)
      throw new ApiError(409, "IDEMPOTENCY_CONFLICT");
    return json({ ok: true });
  }
  const found =
    resource === "post"
      ? await prisma.post.count({ where: { id: contentId, published: true } })
      : await prisma.note.count({ where: { id: contentId, published: true } });
  if (!found) throw new ApiError(404, "CONTENT_NOT_FOUND");
  try {
    await prisma.feedback.create({
      data: {
        ...where,
        payloadHash,
        resource,
        contentId,
        type: type as string,
        message,
        contact: contact || null,
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code !== "P2002") throw e;
    const row = await prisma.feedback.findUnique({
      where,
      select: { payloadHash: true },
    });
    if (row?.payloadHash !== payloadHash)
      throw new ApiError(409, "IDEMPOTENCY_CONFLICT");
  }
  return json({ ok: true });
});
export const GET = endpoint(async (req: Request) => {
  await admin(req);
  const params = new URL(req.url).searchParams;
  const { current, pageSize, skip, take } = pagination(params);
  const status = params.get("status");
  if (status && !["NEW", "RESOLVED", "IGNORED"].includes(status))
    throw new ApiError(400, "INVALID_STATUS");
  const where = status ? { status } : {};
  const [total, rows] = await prisma.$transaction([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where,
      select: {
        id: true,
        resource: true,
        contentId: true,
        type: true,
        message: true,
        contact: true,
        status: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
  ]);
  const [posts, notes] = await Promise.all([
    prisma.post.findMany({
      where: {
        id: {
          in: rows.filter((r) => r.resource === "post").map((r) => r.contentId),
        },
      },
      select: { id: true, title: true, slug: true, published: true },
    }),
    prisma.note.findMany({
      where: {
        id: {
          in: rows.filter((r) => r.resource === "note").map((r) => r.contentId),
        },
      },
      select: { id: true, title: true, slug: true, published: true },
    }),
  ]);
  return json({
    ok: true,
    data: rows.map((row) => {
      const item = (row.resource === "post" ? posts : notes).find(
        (item) => item.id === row.contentId,
      );
      return {
        ...row,
        source: item
          ? {
              ...item,
              url: item.published
                ? getSiteUrl() +
                  (row.resource === "post" ? "/posts/" : "/notes/") +
                  item.slug
                : null,
            }
          : null,
      };
    }),
    total,
    current,
    pageSize,
    pages: Math.ceil(total / pageSize),
  });
});
export const PATCH = endpoint(async (req: Request) => {
  await admin(req);
  const value = await body(req);
  const id = idField(value.id);
  if (!id || !["NEW", "RESOLVED", "IGNORED"].includes(value.status as string))
    throw new ApiError(400, "INVALID_FEEDBACK_UPDATE");
  await prisma.feedback.update({
    where: { id },
    data: { status: value.status as string },
  });
  return json({ ok: true });
});
