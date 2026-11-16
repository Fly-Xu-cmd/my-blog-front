import { prisma } from '@/lib/prisma';
import { checkAuth } from '../auth';
import { ApiError, body, endpoint, json, textField, idField, markdownField } from '@/lib/api';
import { extractDescription } from '@/lib/seo';
import { revalidatePath } from 'next/cache';
export const POST = endpoint(async (req: Request) => {
  if (!(await checkAuth())) throw new ApiError(401, 'UNAUTHORIZED');
  const data = await body(req);
  if (data.published !== undefined || data.kind !== undefined)
    throw new ApiError(400, 'PUBLISH_VIA_ADMIN');
  const syncId = textField(data.syncId, 512, true)!;
  const slug = textField(data.slug, 255, true)!;
  if (
    !/^[\p{L}\p{N}_-][\p{L}\p{N}_.-]*$/u.test(slug) ||
    slug.includes('..') ||
    ['sync', 'delete', 'meta', 'auth'].includes(slug)
  )
    throw new ApiError(400, 'INVALID_SLUG');
  const title = textField(data.title, 255, true)!;
  const content = markdownField(data.content, true)!;
  const hash = textField(data.hash, 128, true)!;
  const categoryId = idField(data.categoryId);
  const tagIds =
    data.tagIds === undefined
      ? undefined
      : data.tagIds === null
        ? []
        : Array.isArray(data.tagIds)
          ? [...new Set(data.tagIds.map((v) => idField(v)))]
          : null;
  if (tagIds === null || tagIds?.some((v) => !v) || (tagIds?.length ?? 0) > 30)
    throw new ApiError(400, 'INVALID_TAGS');
  const date = (v: unknown) => {
    if (v === undefined) return undefined;
    if (typeof v !== 'string' || !Number.isFinite(Date.parse(v)))
      throw new ApiError(400, 'INVALID_DATE');
    return new Date(v);
  };
  const createdAt = date(data.createdAt),
    updatedAt = date(data.updatedAt);
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.note.findUnique({ where: { syncId }, include: { tags: true } });
    if (existing && existing.slug !== slug) throw new ApiError(409, 'SLUG_IMMUTABLE');
    const other = await tx.note.findUnique({ where: { slug }, select: { syncId: true } });
    if (other && other.syncId !== syncId) throw new ApiError(409, 'SYNC_ID_CONFLICT');
    if (categoryId && !(await tx.category.findUnique({ where: { id: categoryId } })))
      throw new ApiError(400, 'CATEGORY_NOT_FOUND');
    if (
      tagIds &&
      (await tx.tag.count({ where: { id: { in: tagIds as number[] } } })) !== tagIds.length
    )
      throw new ApiError(400, 'TAG_NOT_FOUND');
    const same =
      existing &&
      existing.hash === hash &&
      existing.content === content &&
      existing.title === title &&
      (categoryId === undefined || existing.categoryId === categoryId) &&
      (tagIds === undefined ||
        [...existing.tags.map((t) => t.tagId)].sort().join(',') === [...tagIds].sort().join(',')) &&
      (createdAt === undefined || +existing.createdAt === +createdAt) &&
      (updatedAt === undefined || +existing.updatedAt === +updatedAt);
    if (same) return 'skipped';
    const noteData = {
      syncId,
      slug,
      title,
      content,
      hash,
      excerpt: extractDescription(content),
      categoryId,
      createdAt,
      updatedAt,
      tags:
        tagIds === undefined
          ? undefined
          : {
              ...(existing ? { deleteMany: {} } : {}),
              create: tagIds.map((id) => ({ tag: { connect: { id: id! } } })),
            },
    };
    if (existing) await tx.note.update({ where: { id: existing.id }, data: noteData });
    else await tx.note.create({ data: { ...noteData, published: false } });
    return 'success';
  });
  if (result !== 'skipped') {
    revalidatePath('/notes');
    revalidatePath('/notes/' + slug);
    revalidatePath('/sitemap.xml');
  }
  return json({ status: result });
});
