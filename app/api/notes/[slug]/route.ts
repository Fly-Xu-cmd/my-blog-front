import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const note = await prisma.note.findUnique({
      where: { slug },
      include: {
        category: true,
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ ok: false, error: "笔记不存在" }, { status: 404 });
    }

    const formattedNote = {
      ...note,
      tags: note.tags.map((nt: { tag: { name: string } }) => nt.tag.name),
    };

    return NextResponse.json({ ok: true, data: formattedNote });
  } catch (error) {
    console.error("获取单篇笔记失败：", error);
    return NextResponse.json({ ok: false, error: "服务器错误" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await req.json();
    const { title, content, published, categoryId, tags } = body;

    const note = await prisma.note.update({
      where: { slug },
      data: {
        title,
        content,
        published: typeof published === 'boolean' ? published : undefined,
        categoryId: categoryId || undefined,
        tags: tags
          ? {
              deleteMany: {}, // 移除所有旧标签关联
              create: tags.map((tag: string) => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tag },
                    create: { name: tag },
                  },
                },
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json({ ok: true, data: note });
  } catch (error) {
    console.error("更新笔记失败：", error);
    return NextResponse.json({ ok: false, error: "更新笔记失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    await prisma.note.delete({
      where: { slug },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("删除笔记失败：", error);
    return NextResponse.json({ ok: false, error: "删除笔记失败" }, { status: 500 });
  }
}
