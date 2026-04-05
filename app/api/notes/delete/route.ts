import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '../auth';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  const isAuthorized = await checkAuth();
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { syncIds } = body;

    if (!Array.isArray(syncIds)) {
      return NextResponse.json({ error: 'Invalid payload, expected array of syncIds' }, { status: 400 });
    }

    if (syncIds.length === 0) {
      return NextResponse.json({ status: "deleted", count: 0 }, { status: 200 });
    }

    const result = await prisma.note.deleteMany({
      where: {
        syncId: {
          in: syncIds
        }
      }
    });

    // 触发对应列表页或相关路由的缓存重验证
    revalidatePath('/notes');
    revalidatePath('/frontend/notes'); // 适配前端路由结构
    revalidatePath('/', 'layout');

    return NextResponse.json({ status: "deleted", count: result.count }, { status: 200 });

  } catch (error) {
    console.error('Failed to delete notes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
