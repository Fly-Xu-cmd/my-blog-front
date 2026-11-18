import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { ApiError } from './api';
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
export const payloadHash = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
export async function createOnce(
  req: Request,
  actor: string,
  resource: 'post' | 'note',
  payload: unknown,
  prepare: () => Promise<(tx: Prisma.TransactionClient) => Promise<{ id: number; slug: string }>>,
) {
  const key = req.headers.get('idempotency-key') ?? '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))
    throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  const where = { resource_actor_key: { resource, actor, key: key.toLowerCase() } };
  const hash = payloadHash(payload);
  const replay = async () => {
    const record = await prisma.creationRequest.findUnique({ where });
    if (!record) return null;
    if (record.payloadHash !== hash) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT');
    const exists =
      resource === 'post'
        ? await prisma.post.findUnique({ where: { id: record.resultId }, select: { id: true } })
        : await prisma.note.findUnique({ where: { id: record.resultId }, select: { id: true } });
    if (!exists) throw new ApiError(410, 'CONTENT_DELETED');
    return record.response;
  };
  const previous = await replay();
  if (previous) return previous;
  const create = await prepare();
  // A deadlock rolls back the whole transaction. Retry only database work, never preparation.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const reservation = await tx.creationRequest.create({
            data: {
              resource,
              actor,
              key: key.toLowerCase(),
              payloadHash: hash,
              resultId: 0,
              response: {},
            },
          });
          const result = await create(tx);
          const response = JSON.parse(
            JSON.stringify({ ok: true, data: { id: result.id, slug: result.slug } }),
          ) as Prisma.InputJsonValue;
          await tx.creationRequest.update({
            where: { id: reservation.id },
            data: { resultId: result.id, response },
          });
          return response;
        },
        { timeout: 15000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        const result = await replay();
        if (result) return result;
      }
      if ((error as { code?: string })?.code === 'P2034' && attempt < 4) {
        await new Promise((resolve) =>
          setTimeout(resolve, 25 * (attempt + 1) + Math.random() * 50),
        );
        continue;
      }
      throw error;
    }
  }
  throw new ApiError(503, 'CREATE_UNAVAILABLE');
}
