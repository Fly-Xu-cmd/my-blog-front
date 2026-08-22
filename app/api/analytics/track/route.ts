import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidPath, isValidVisitorId, tryAcquirePvDedup } from "@/lib/analytics";

/**
 * PV 上报接口（POST /api/analytics/track）
 * 请求体 { path, visitorId }；referrer 与 UA 由服务端从请求头解析；
 * 同一访客同一路径 10 秒内防重，防重命中时不报错、不落库
 */
export async function POST(req: Request) {
  // 解析并校验请求体参数
  let body: { path?: unknown; visitorId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid path/visitorId" }, { status: 400 });
  }
  const path = typeof body.path === "string" ? body.path : "";
  const visitorId = typeof body.visitorId === "string" ? body.visitorId : "";
  if (!isValidPath(path) || !isValidVisitorId(visitorId)) {
    return NextResponse.json({ error: "invalid path/visitorId" }, { status: 400 });
  }

  // 服务端解析来源 hostname（解析失败或缺失时存 null，不保存完整 URL）
  let referrerHost: string | null = null;
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      referrerHost = new URL(referer).hostname.slice(0, 255);
    } catch {
      referrerHost = null;
    }
  }

  // UA 截断到 512 字符后存储（缺失时存 null）
  const userAgentRaw = req.headers.get("user-agent");
  const userAgent = userAgentRaw ? userAgentRaw.slice(0, 512) : null;

  // PV 防重：10 秒内同访客同路径的重复上报直接返回，不报错
  const acquired = await tryAcquirePvDedup(visitorId, path);
  if (!acquired) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  await prisma.pageView.create({
    data: { path, visitorId, referrerHost, userAgent },
  });
  return NextResponse.json({ ok: true });
}
