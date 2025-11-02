import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
/**
 * 获取单条动态内容
 * @param req
 * @param param1
 * @returns
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "动态ID不能为空" },
      { status: 400 }
    );
  }
  const post = await prisma.dynamic.findUnique({
    where: {
      id: Number(id),
    },
  });
  if (!post) {
    return NextResponse.json(
      { ok: false, error: "动态未找到" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, data: post });
}

/**
 * 更新动态
 * @param req
 * @param param1
 * @returns
 */

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "动态ID不能为空" },
      { status: 400 }
    );
  }
  const body = await req.json();
  const { content } = body;
  if (!content) {
    return NextResponse.json(
      { ok: false, error: "动态内容不能为空" },
      { status: 400 }
    );
  }
  const post = await prisma.dynamic.update({
    where: {
      id: Number(id),
    },
    data: {
      content,
    },
  });
  if (!post) {
    return NextResponse.json(
      { ok: false, error: "动态未找到" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, data: post });
}

/**
 * 删除动态
 * @param req
 * @param param1
 * @returns
 */

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "动态ID不能为空" },
      { status: 400 }
    );
  }
  const post = await prisma.dynamic.delete({
    where: {
      id: Number(id),
    },
  });
  if (!post) {
    return NextResponse.json(
      { ok: false, error: "动态未找到" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, data: post });
}
