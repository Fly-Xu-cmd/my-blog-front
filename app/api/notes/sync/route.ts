import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "../auth";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const isAuthorized = await checkAuth();
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { syncId, slug, title, content, hash, categoryId, tagIds, createdAt, updatedAt } = body;

    // 参数校验
    if (!syncId || !slug || !title || !content || !hash) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 将物理时间字符串实例化为 Date 对象
    const localCreatedAt = createdAt ? new Date(createdAt) : undefined;
    const localUpdatedAt = updatedAt ? new Date(updatedAt) : undefined;

    // 1. 【双重查找】
    const existingNote = await prisma.note.findFirst({
      where: {
        OR: [{ syncId }, { slug }],
      },
    });

    // 2. 【防冗余校验】
    if (
      existingNote &&
      existingNote.syncId === syncId &&
      existingNote.hash === hash
    ) {
      return NextResponse.json({ status: "skipped" }, { status: 200 });
    }

    const tagIdsArray: number[] = Array.isArray(tagIds) ? tagIds : [];

    const noteData = {
      syncId,
      slug,
      title,
      content,
      hash,
      categoryId: categoryId || null,
      createdAt: localCreatedAt, // 显式覆盖物理创建时间
      updatedAt: localUpdatedAt, // 显式覆盖物理更新时间
    };

    // 3. 【更新 (Update)】 4. 【新建 (Create)】 5. 【显式关联处理】
    if (existingNote) {
      await prisma.note.update({
        where: { id: existingNote.id },
        data: {
          ...noteData,
          tags: {
            deleteMany: {},
            create: tagIdsArray.map((id) => ({
              tag: { connect: { id } },
            })),
          },
        },
      });
    } else {
      await prisma.note.create({
        data: {
          ...noteData,
          published: true,
          tags: {
            create: tagIdsArray.map((id) => ({
              tag: { connect: { id } },
            })),
          },
        },
      });
    }

    // 6. 【缓存重验证】
    revalidatePath("/notes");
    revalidatePath(`/notes/${slug}`);

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error) {
    console.error("Failed to sync note:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
