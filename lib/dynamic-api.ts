import { extractDescription } from './seo';
import { prisma } from './prisma';
import { admin, ApiError, body, endpoint, idField, json, textField, markdownField } from './api';
import { contentFields, publishTime } from './content';
export const createDynamic = endpoint(async (req: Request) => {
  await admin(req);
  const data = await body(req);
  const fields = contentFields(data);
  const content = markdownField(data.content, true)!;
  if (data.excerpt !== null) textField(data.excerpt, 512);
  return json({
    ok: true,
    data: await prisma.dynamic.create({
      data: {
        ...fields,
        content,
        excerpt: fields.excerpt ?? extractDescription(content, 150),
        published: fields.published ?? false,
        publishedAt: publishTime(fields.published),
      },
    }),
  });
});
export async function updateDynamic(req: Request, id: number) {
  await admin(req);
  const data = await body(req);
  const fields = contentFields(data);
  textField(data.excerpt, 512);
  const result = await prisma.$transaction(async (tx) => {
    if (fields.published === true)
      await tx.dynamic.updateMany({
        where: { id, publishedAt: null },
        data: { publishedAt: new Date() },
      });
    return tx.dynamic.update({
      where: { id },
      data: { ...fields, excerpt: fields.excerpt === null ? '' : fields.excerpt },
    });
  });
  return json({ ok: true, data: result });
}
export async function deleteDynamic(req: Request, id: number) {
  await admin(req);
  await prisma.dynamic.delete({ where: { id } });
  return json({ ok: true });
}
export function dynamicId(key: unknown) {
  const id = typeof key === 'string' && /^[1-9]\d*$/.test(key) ? Number(key) : key;
  const value = idField(id);
  if (!value) throw new ApiError(400, 'INVALID_ID');
  return value;
}
