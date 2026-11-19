import {
  admin,
  adminScope,
  body,
  endpoint,
  json,
  textField,
  booleanField,
} from "@/lib/api";
import {
  categoryField,
  contentFields,
  format,
  listContent,
  relations,
  seriesFields,
  tagWrite,
  publishTime,
  names,
} from "@/lib/content";
import { createWithSlug, manualSlug } from "@/lib/slug";
import { createOnce } from "@/lib/idempotency";
import { extractDescription } from "@/lib/seo";
import { generateAITitle, generateAISummary } from "@/lib/ai";
import { recordRevision } from "@/lib/post-revisions";
export const GET = endpoint(async (req: Request) =>
  json(
    await listContent(
      "post",
      new URL(req.url).searchParams,
      await adminScope(req),
    ),
  ),
);
export const POST = endpoint(async (req: Request) => {
  const actor = await admin(req);
  const data = await body(req);
  const fields = contentFields(data, false);
  textField(data.content, 4_000_000, true);
  const supplied = manualSlug(data.slug);
  const cover = data.cover === null ? null : textField(data.cover, 512);
  const autoTitle = booleanField(data.autoGenerateTitle) ?? false;
  const autoSummary = booleanField(data.autoGenerateSummary) ?? false;
  const tags = names(data.tags);
  const payload = {
    ...fields,
    published: fields.published ?? false,
    slug: supplied,
    cover: cover ?? null,
    autoTitle,
    autoSummary,
    tags: tags ?? [],
    categoryId: data.categoryId ?? null,
    seriesId: data.seriesId ?? null,
    seriesOrder: data.seriesOrder ?? null,
  };
  return json(
    await createOnce(req, actor, "post", payload, async () => {
      const title = textField(
        fields.title ||
          (autoTitle ? await generateAITitle(fields.content!) : ""),
        255,
        true,
      )!;
      const excerpt =
        autoSummary && !data.excerpt
          ? await generateAISummary(fields.content!)
          : (fields.excerpt ?? extractDescription(fields.content!, 150));
      return async (tx) => {
        const categoryId = await categoryField(data.categoryId, tx);
        const series = await seriesFields(data, null, tx);
        const relationTags = await tagWrite(tags, tx);
        const created = await createWithSlug(
          title,
          "post",
          supplied,
          async (slug) =>
            await tx.post.create({
              data: {
                title,
                content: fields.content!,
                excerpt,
                cover,
                slug,
                published: fields.published ?? false,
                publishedAt: publishTime(fields.published),
                categoryId,
                ...series,
                tags: relationTags,
              },
              include: relations,
            }),
        );
        await recordRevision(tx, created, actor);
        return format(created);
      };
    }),
  );
});
