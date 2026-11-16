import { prisma } from '@/lib/prisma';
import { checkAuth } from '../auth';
import { ApiError, body, endpoint, json } from '@/lib/api';
export const POST = endpoint(async (req: Request) => {
  if (!(await checkAuth())) throw new ApiError(401, 'UNAUTHORIZED');
  const { syncIds } = await body(req);
  if (
    !Array.isArray(syncIds) ||
    syncIds.length > 500 ||
    syncIds.some((id) => typeof id !== 'string' || !id || id.length > 512)
  )
    throw new ApiError(400, 'INVALID_SYNC_IDS');
  const result = await prisma.$transaction(async (tx) => {
    await tx.noteTag.deleteMany({ where: { note: { syncId: { in: syncIds } } } });
    return tx.note.deleteMany({ where: { syncId: { in: syncIds } } });
  });
  return json({ status: 'deleted', count: result.count });
});
