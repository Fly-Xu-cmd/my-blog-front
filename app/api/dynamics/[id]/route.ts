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
  console.log("params", params);
  const { id } = await params;
  const post = await prisma.dynamic.findUnique({
    where: {
      id: Number(id),
    },
  });
  if (!post) {
    return NextResponse.json({ error: "动态未找到" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, post });
}
