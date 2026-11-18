import { admin, endpoint, json } from '@/lib/api';
export const GET = endpoint(async (req: Request) =>
  json({ ok: true, data: { username: await admin(req) } }),
);
