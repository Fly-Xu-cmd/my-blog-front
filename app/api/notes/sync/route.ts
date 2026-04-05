import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

// Token 安全校验辅助函数
function checkAuth(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

  const token = authHeader.substring(7);
  const expectedToken = process.env.SYNC_API_TOKEN || '';

  if (!token || !expectedToken) return false;

  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedToken);

  if (tokenBuffer.length !== expectedBuffer.length) {
    // 抵御时序攻击
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }

  return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { syncId, slug, title, content, hash, categoryId, tagIds } = body;

    // 参数校验
    if (!syncId || !slug || !title || !content || !hash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. 查找现有笔记：优先根据 syncId，降级根据 slug 认领旧文件
    let existingNote = await prisma.note.findUnique({
      where: { syncId }
    });

    if (!existingNote) {
      existingNote = await prisma.note.findUnique({
        where: { slug }
      });
    }

    // 2. 防冗余校验：基于 Hash 和 syncId 均一致判断完全没有变更
    if (existingNote && existingNote.hash === hash && existingNote.syncId === syncId) {
      return NextResponse.json({ status: "skipped", message: "Hash and path matched, skipping update." }, { status: 200 });
    }

    // 格式化标签入参，用于多对多(显式中间表)操作
    const tagIdsArray = Array.isArray(tagIds) ? tagIds : [];
    
    const noteData = {
      syncId,
      slug,
      title,
      content,
      hash,
      categoryId: categoryId || null,
    };

    let resultNote;

    // 3. 区分 Update 和 Create 写入避免 Unique Constraint 冲突
    if (existingNote) {
      // 存在记录则更新（包含正常更新以及“认领”旧文件的 syncId 路径更新）
      resultNote = await prisma.note.update({
        where: { id: existingNote.id },
        data: {
          ...noteData,
          tags: {
            deleteMany: {},
            create: tagIdsArray.map((id: number) => ({
              tag: { connect: { id } }
            }))
          }
        }
      });
    } else {
      // 全新记录则创建
      resultNote = await prisma.note.create({
        data: {
          ...noteData,
          tags: {
            create: tagIdsArray.map((id: number) => ({
              tag: { connect: { id } }
            }))
          }
        }
      });
    }

    // 3. 缓存重验证：调用 revalidatePath 刷新受影响页面
    // 刷新笔记的动态路由页
    revalidatePath(`/frontend/notes/${slug}`);
    // 刷新全站布局或笔记聚合页
    revalidatePath('/frontend/notes', 'layout'); 

    return NextResponse.json({ status: "success", data: resultNote }, { status: 200 });

  } catch (error) {
    console.error('Failed to sync note:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
