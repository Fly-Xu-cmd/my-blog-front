import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidVisitorId, touchHeartbeat } from "@/lib/analytics";

/**
 * 心跳上报接口（POST /api/analytics/heartbeat）
 * 请求体 { visitorId }；刷新该访客的在线状态，
 * 返回 { online, pv, uv }（当前在线人数、全站 PV、全站 UV）
 */
export async function POST(req: Request) {
  // 解析并校验请求体参数
  let body: { visitorId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid visitorId" }, { status: 400 });
  }
  const visitorId = typeof body.visitorId === "string" ? body.visitorId : "";
  if (!isValidVisitorId(visitorId)) {
    return NextResponse.json({ error: "invalid visitorId" }, { status: 400 });
  }

  // 刷新心跳时间戳并统计当前在线人数
  const online = await touchHeartbeat(visitorId);

  // 全站 PV
  const pv = await prisma.pageView.count();

  // 全站 UV：COUNT(DISTINCT) 需用原生 SQL（tagged template），返回 BigInt 需转换为 Number
  const uvRows = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(DISTINCT visitorId) AS count FROM PageView`;
  const uv = Number(uvRows[0]?.count ?? 0);

  return NextResponse.json({ online, pv, uv });
}
