import { adminScope, endpoint, json } from '@/lib/api';
import { detail } from '@/lib/content';
import { deleteDynamic, dynamicId, updateDynamic } from '@/lib/dynamic-api';
type Context = { params: Promise<{ id: string }> };
export const GET = endpoint(async (req: Request, ctx: Context) =>
  json({ ok: true, data: await detail('dynamic', (await ctx.params).id, await adminScope(req)) }),
);
export const PUT = endpoint(async (req: Request, ctx: Context) =>
  updateDynamic(req, dynamicId((await ctx.params).id)),
);
export const DELETE = endpoint(async (req: Request, ctx: Context) =>
  deleteDynamic(req, dynamicId((await ctx.params).id)),
);
