import { prisma } from '@/lib/prisma';
import { checkAuth } from '../auth';
import { ApiError, endpoint, json } from '@/lib/api';
export const GET = endpoint(async () => {
  if (!(await checkAuth())) throw new ApiError(401, 'UNAUTHORIZED');
  const [categories, tags, notes] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.tag.findMany({ select: { id: true, name: true } }),
    prisma.note.findMany({ select: { syncId: true } }),
  ]);
  return json({ categories, tags, serverSyncIds: notes.map((n) => n.syncId) });
});
