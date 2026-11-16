import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { ApiError, endpoint, json } from '@/lib/api';
import { cached } from '@/lib/analytics-cache';
export const GET = endpoint(async (req: Request) => {
  const path = new URL(req.url).searchParams.get('path') ?? '';
  if (!path.startsWith('/') || path.length > 512) throw new ApiError(400, 'INVALID_PATH');
  const canonical =
    path === '/frontend' ? '/' : path.startsWith('/frontend/') ? path.slice(9) : path;
  const paths = [canonical, '/frontend' + (canonical === '/' ? '' : canonical)];
  const views = await cached('views:' + createHash('sha256').update(canonical).digest('hex'), () =>
    prisma.pageView.count({ where: { path: { in: paths } } }),
  );
  return json({ path, views });
});
