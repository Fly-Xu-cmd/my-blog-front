import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const dynamics = await prisma.dynamic.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(dynamics);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { content, excerpt } = await req.json();
    if (!content || !excerpt) {
      return NextResponse.json({ error: "缺少内容或简介" }, { status: 400 });
    }
    const dynamic = await prisma.dynamic.create({
      data: {
        content,
        excerpt,
      },
    });
    return NextResponse.json({ ok: true, dynamic });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
