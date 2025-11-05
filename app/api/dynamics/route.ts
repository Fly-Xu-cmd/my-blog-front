import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const dynamics = await prisma.dynamic.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json({
      ok: true,
      data: dynamics,
      total: dynamics.length,
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
        { status: 400 }
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
        { status: 400 }
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
