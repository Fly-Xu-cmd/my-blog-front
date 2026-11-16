import { randomUUID } from 'crypto';
import { admin, adminScope, body, ApiError, endpoint, json } from '@/lib/api';
import {
  categoryField,
  contentFields,
  format,
  listContent,
  tagWrite,
  publishTime,
  names,
} from '@/lib/content';
import { createWithSlug, manualSlug } from '@/lib/slug';
import { createOnce } from '@/lib/idempotency';
export const GET = endpoint(async (req: Request) =>
  json(await listContent('note', new URL(req.url).searchParams, await adminScope(req))),
);
export const POST = endpoint(async (req: Request) => {
  const actor = await admin(req);
  const data = await body(req);
  const fields = contentFields(data, true);
  if (data.kind !== undefined && data.kind !== 'TECH' && data.kind !== 'ESSAY')
    throw new ApiError(400, 'INVALID_KIND');
  const kind = (data.kind ?? 'TECH') as 'TECH' | 'ESSAY';
  const tags = names(data.tags);
  const supplied = manualSlug(data.slug);
  return json(
    await createOnce(
      req,
      actor,
      'note',
      {
        ...fields,
        published: fields.published ?? false,
        kind,
        tags: tags ?? [],
        slug: supplied,
        categoryId: data.categoryId ?? null,
      },
      async () => {
        const syncId = 'local-' + randomUUID();
        return async (tx) => {
          const categoryId = await categoryField(data.categoryId, tx);
          const relationTags = await tagWrite(tags, tx);
          return createWithSlug(fields.title!, 'note', supplied, async (slug) =>
            format(
              await tx.note.create({
                data: {
                  title: fields.title!,
                  content: fields.content!,
                  excerpt: fields.excerpt,
                  slug,
                  kind,
                  syncId,
                  published: fields.published ?? false,
                  publishedAt: publishTime(fields.published),
                  categoryId,
                  tags: relationTags,
                },
                include: { category: true, tags: { include: { tag: true } } },
              }),
            ),
          );
        };
      },
    ),
  );
});
