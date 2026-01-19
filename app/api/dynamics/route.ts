import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const current = parseInt(searchParams.get("current") || "1");
  const size = parseInt(searchParams.get("size") || "10");

  try {
    // 先获取总数（用于分页计算）
    const total = await prisma.dynamic.count({
      where: {
        title: title ? { contains: title } : undefined,
      },
    });

    // 获取分页数据
    const dynamics = await prisma.dynamic.findMany({
      where: {
        title: title ? { contains: title } : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (current - 1) * size,
      take: size,
    });
    return NextResponse.json({
      ok: true,
      data: dynamics,
      total,
      current,
      size,
      pages: Math.ceil(total / size),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { content, excerpt, title } = await req.json();
    if (!content || !excerpt) {
      return NextResponse.json({ error: "缺少内容或简介" }, { status: 400 });
    }
    const dynamic = await prisma.dynamic.create({
      data: {
        content,
        excerpt,
        title,
      },
    });
    return NextResponse.json({ ok: true, data: dynamic });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json(); // ✅ 注意这里要 await
    if (!Number(id)) {
      return NextResponse.json({ error: "缺少动态ID" }, { status: 400 });
    }
    const deletedDynamic = await prisma.dynamic.delete({
      where: {
        id: Number(id),
      },
    });
    return NextResponse.json({ ok: true, data: deletedDynamic });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
export async function PUT(req: NextRequest) {
  try {
    const { id, content, excerpt } = await req.json();
    if (!Number(id) || !content || !excerpt) {
      return NextResponse.json(
        { error: "缺少动态ID或内容或简介" },
        { status: 400 },
      );
    }
    const dynamic = await prisma.dynamic.update({
      where: {
        id: Number(id),
      },
      data: {
        content,
        excerpt,
      },
    });
    return NextResponse.json({ ok: true, data: dynamic });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { content, excerpt, id } = await req.json();
    if (!Number(id) || (!content && !excerpt)) {
      return NextResponse.json(
        { error: "缺少动态ID或内容或简介" },
        { status: 400 },
      );
    }
    const dynamic = await prisma.dynamic.update({
      where: {
        id: Number(id),
      },
      data: {
        content,
        excerpt,
      },
    });
    return NextResponse.json({ ok: true, data: dynamic });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
