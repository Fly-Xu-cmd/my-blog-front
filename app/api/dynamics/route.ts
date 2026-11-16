import { admin, adminScope, body, endpoint, json } from '@/lib/api';
import { listContent } from '@/lib/content';
import { createDynamic, deleteDynamic, dynamicId, updateDynamic } from '@/lib/dynamic-api';
export const GET = endpoint(async (req: Request) =>
  json(await listContent('dynamic', new URL(req.url).searchParams, await adminScope(req))),
);
export const POST = createDynamic;
export const DELETE = endpoint(async (req: Request) => {
  await admin(req);
  const data = await body(req);
  return deleteDynamic(req, dynamicId(data.id));
});
export const PUT = endpoint(async (req: Request) => {
  await admin(req);
  const data = await body(req.clone());
  return updateDynamic(req, dynamicId(data.id));
});
export const PATCH = PUT;
