import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidPath } from "@/lib/analytics";

/**
 * 规范化路径：将新路径映射为旧路径候选，兼容路由迁移前后的历史 PV 数据
 * 例如 /posts/xxx → [/posts/xxx, /frontend/posts/xxx]
 * @param path 用户传入的路径
 * @returns 需要合并统计的路径数组（去重）
 */
function getPathVariants(path: string): string[] {
  const variants = new Set<string>();
  variants.add(path);
  // 新路径（不带 /frontend）→ 补充旧路径（带 /frontend）
  if (!path.startsWith("/frontend")) {
    variants.add(`/frontend${path === "/" ? "" : path}`);
  }
  // 旧路径 → 补充新路径
  if (path.startsWith("/frontend")) {
    const stripped = path.slice("/frontend".length) || "/";
    variants.add(stripped);
  }
  return Array.from(variants);
}

/**
 * 单页访问量查询接口（GET /api/analytics/views?path=xxx）
 * 返回 { path, views }（指定路径的累计访问次数，自动合并新旧路径历史数据）
 */
export async function GET(req: Request) {
  // 解析并校验 path 查询参数
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";
  if (!isValidPath(path)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  // 合并新旧路径的 PV 数据，保证路由迁移后阅读量不丢失
  const paths = getPathVariants(path);
  const views = await prisma.pageView.count({ where: { path: { in: paths } } });
  return NextResponse.json({ path, views });
}
