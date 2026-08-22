import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOnlineCount } from "@/lib/analytics";

/**
 * 站点统计公开接口（GET /api/analytics/site，无参数）
 * 返回 { pv, uv, online }（全站 PV、全站 UV、当前在线人数）
 */
export async function GET() {
  // 当前在线人数（含过期成员清理）
  const online = await getOnlineCount();

  // 全站 PV
  const pv = await prisma.pageView.count();

  // 全站 UV：COUNT(DISTINCT) 需用原生 SQL（tagged template），返回 BigInt 需转换为 Number
  const uvRows = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(DISTINCT visitorId) AS count FROM PageView`;
  const uv = Number(uvRows[0]?.count ?? 0);

  return NextResponse.json({ pv, uv, online });
}
