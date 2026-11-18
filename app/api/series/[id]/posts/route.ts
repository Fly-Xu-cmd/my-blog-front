import { admin, ApiError, endpoint, idField, json } from '@/lib/api';
import { prisma } from '@/lib/prisma';

// Ordering needs the complete membership, including drafts, but never the body.
export const GET = endpoint(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    await admin(req);
    const id = idField(Number((await ctx.params).id));
    if (!id) throw new ApiError(400, 'INVALID_ID');
    const series = await prisma.series.findUnique({
      where: { id },
      select: {
        posts: {
          orderBy: [{ seriesOrder: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            title: true,
            slug: true,
            cover: true,
            published: true,
            seriesOrder: true,
          },
        },
      },
    });
    if (!series) throw new ApiError(404, 'NOT_FOUND');
    return json({ ok: true, data: series.posts, total: series.posts.length });
  },
);
