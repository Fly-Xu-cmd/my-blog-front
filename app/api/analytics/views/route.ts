import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidPath } from "@/lib/analytics";

/**
 * 单页访问量查询接口（GET /api/analytics/views?path=xxx）
 * 返回 { path, views }（指定路径的累计访问次数）
 */
export async function GET(req: Request) {
  // 解析并校验 path 查询参数
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";
  if (!isValidPath(path)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const views = await prisma.pageView.count({ where: { path } });
  return NextResponse.json({ path, views });
}
