import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { ApiError, booleanField, idField, pagination, textField, markdownField } from './api';
import { extractDescription } from './seo';
export type Resource = 'post' | 'note' | 'dynamic';
export const relations = { category: true, tags: { include: { tag: true } }, series: true };
const taxonomy = { category: true, tags: { include: { tag: true } } };
export const postSummary = {
 content:true,
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  cover: true,
  published: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  seriesId: true,
  seriesOrder: true,
  ...relations,
};
export const noteSummary = {
 content:true,
  id: true,
  title: true,
  slug: true,
  syncId: true,
  excerpt: true,
  kind: true,
  published: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  ...taxonomy,
};
const dynamicSummary = {
 content:true,
  id: true,
  title: true,
  excerpt: true,
  published: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
};
export function format<T extends { tags?: { tag: { name: string } }[] }>(row: T) {
  return { ...row, ...(row.tags ? { tags: row.tags.map((t) => t.tag.name) } : {}) };
}
export function filter(params: URLSearchParams, isAdmin: boolean) {
  const status = params.get('published');
  if (status !== null && !['true', 'false'].includes(status))
    throw new ApiError(400, 'INVALID_PUBLISHED');
  if (!isAdmin && status === 'false') throw new ApiError(403, 'FORBIDDEN');
  const q = params.get('q')?.trim();
  if (q && q.length > 200) throw new ApiError(400, 'INVALID_SEARCH');
  return {
    published: isAdmin ? (status === null ? undefined : status === 'true') : true,
    ...(q ? { OR: [{ title: { contains: q } }, { content: { contains: q } }] } : {}),
    ...(params.get('title') ? { title: { contains: params.get('title')! } } : {}),
  };
}
export async function listContent(resource: Resource, params: URLSearchParams, isAdmin = false) {
  const { current, pageSize, skip, take } = pagination(params);
const legacy=!isAdmin&&!params.has('current')&&!params.has('pageSize')&&!params.has('size');
  const where = filter(params, isAdmin);
  const category = params.get('category');
  const tag = params.get('tags');
  const classified = {
    ...where,
    ...(category ? { category: { name: category } } : {}),
    ...(tag ? { tags: { some: { tag: { name: { equals: tag } } } } } : {}),
  };
  const orderBy = isAdmin
    ? [{ createdAt: 'desc' as const }, { id: 'desc' as const }]
    : [{ publishedAt: 'desc' as const }, { id: 'desc' as const }];
  if (resource === 'post') {
    const [total, rows] = await prisma.$transaction([
      prisma.post.count({ where: classified }),
      prisma.post.findMany({ where: classified, select: postSummary, orderBy, skip, take }),
    ]);
    return {
      ok: true,
      data: rows.map(format),
      total,
      current,
      pageSize,
      pages: Math.ceil(total / pageSize),
    };
  }
  if (resource === 'note') {
    const kind = params.get('kind');
    if (kind && kind !== 'TECH' && kind !== 'ESSAY') throw new ApiError(400, 'INVALID_KIND');
    const noteWhere = { ...classified, ...(kind ? { kind: kind as 'TECH' | 'ESSAY' } : {}) };
    const [total, rows] = await prisma.$transaction([
      prisma.note.count({ where: noteWhere }),
      prisma.note.findMany({ where: noteWhere, select: noteSummary, orderBy, skip, take }),
    ]);
    return {
      ok: true,
      data: rows.map(format),
      total,
      current,
      pageSize,
      pages: Math.ceil(total / pageSize),
    };
  }
  const [total, rows] = await prisma.$transaction([
    prisma.dynamic.count({ where }),
    prisma.dynamic.findMany({ where, select: dynamicSummary, orderBy, skip, take }),
  ]);
  return { ok: true, data: rows, total, current, pageSize, pages: Math.ceil(total / pageSize) };
}
export async function detail(resource: Resource, key: string, isAdmin = false) {
  if (resource === 'dynamic') {
    if (!/^[1-9]\d*$/.test(key) || !Number.isSafeInteger(Number(key)))
      throw new ApiError(404, 'NOT_FOUND');
    const row = await prisma.dynamic.findFirst({
      where: { id: Number(key), ...(isAdmin ? {} : { published: true }) },
    });
    if (!row) throw new ApiError(404, 'NOT_FOUND');
    return row;
  }
  if (resource === 'post') {
    const row = await prisma.post.findFirst({
      where: { slug: key, ...(isAdmin ? {} : { published: true }) },
      include: relations,
    });
    if (!row) throw new ApiError(404, 'NOT_FOUND');
    return format(row);
  }
  const row = await prisma.note.findFirst({
    where: { slug: key, ...(isAdmin ? {} : { published: true }) },
    include: taxonomy,
  });
  if (!row) throw new ApiError(404, 'NOT_FOUND');
  return format(row);
}
export function names(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (
    !Array.isArray(value) ||
    value.length > 30 ||
    value.some((v) => typeof v !== 'string' || !v.trim() || v.trim().length > 100)
  )
    throw new ApiError(400, 'INVALID_TAGS');
  return [...new Set((value as string[]).map((v) => v.trim()))].sort();
}
export async function tagWrite(value: unknown, tx: Prisma.TransactionClient) {
  const tags = names(value);
  if (tags === undefined) return undefined;
  const ids: number[] = [];
  for (const name of tags) {
    const tag = await tx.tag.upsert({ where: { name }, create: { name }, update: {} });
    const rows = await tx.$queryRaw<
      { id: number }[]
    >`SELECT id FROM Tag WHERE id = ${tag.id} FOR UPDATE`;
    if (!rows.length) throw new ApiError(409, 'TAG_CONFLICT');
    ids.push(tag.id);
  }
  return { create: ids.map((tagId) => ({ tagId })) };
}
export function contentFields(data: Record<string, unknown>, required = false) {
  const content = markdownField(data.content, required);
  if (typeof data.excerpt === 'string' && Buffer.byteLength(data.excerpt) > 65535)
    throw new ApiError(400, 'INVALID_EXCERPT');
  return {
    title: textField(data.title, 255, required),
    content,
    excerpt:
      data.excerpt === null
        ? null
        : (textField(data.excerpt, 65535) ??
          (required && content !== undefined ? extractDescription(content, 150) : undefined)),
    published: booleanField(data.published),
  };
}
export async function categoryField(value: unknown, tx: Prisma.TransactionClient) {
  const id = idField(value);
  if (id) {
    const rows = await tx.$queryRaw<
      { id: number }[]
    >`SELECT id FROM Category WHERE id = ${id} FOR UPDATE`;
    if (!rows.length) throw new ApiError(400, 'CATEGORY_NOT_FOUND');
  }
  return id;
}
export async function seriesFields(
  data: Record<string, unknown>,
  existing: { seriesId: number | null; seriesOrder: number | null } | null,
  tx: Prisma.TransactionClient,
) {
  if (data.seriesId === undefined && data.seriesOrder === undefined) return {};
  const seriesId =
    data.seriesId === undefined ? (existing?.seriesId ?? null) : (idField(data.seriesId) ?? null);
  const seriesOrder =
    data.seriesId === null
      ? null
      : data.seriesOrder === undefined
        ? (existing?.seriesOrder ?? null)
        : (idField(data.seriesOrder) ?? null);
  if ((seriesId === null) !== (seriesOrder === null))
    throw new ApiError(400, 'INVALID_SERIES_ORDER');
  if (seriesId) {
    const rows = await tx.$queryRaw<
      { id: number }[]
    >`SELECT id FROM Series WHERE id = ${seriesId} FOR UPDATE`;
    if (!rows.length) throw new ApiError(400, 'SERIES_NOT_FOUND');
  }
  return { seriesId, seriesOrder };
}
export const publishTime = (published: boolean | undefined, previous: Date | null = null) =>
  previous ?? (published ? new Date() : null);
