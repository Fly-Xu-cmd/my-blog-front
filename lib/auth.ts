import jwt from 'jsonwebtoken';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * 校验请求的管理员身份：解析 Authorization: Bearer <token> 并用 JWT_SECRET 验证
 * @param req 请求对象
 * @returns 验证通过返回 { ok: true, username }；token 缺失或无效返回 401；token 有效但用户名不匹配返回 403
 */
export async function requireAdmin(
  req: Request,
): Promise<{ ok: true; username: string } | { ok: false; status: 401 | 403 }> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return { ok: false as const, status: 401 as const };
  }
  try {
    // 不给 algorithms，就等于允许按 token 头里的 alg 验证-算法混淆的来源
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? '', {
      algorithms: ['HS256'],
    }) as jwt.JwtPayload;

    if (
      !process.env.ADMIN_USERNAME ||
      typeof payload?.username !== 'string' ||
      payload.username !== process.env.ADMIN_USERNAME
    ) {
      return { ok: false as const, status: 403 as const };
    }
    return { ok: true as const, username: payload.username as string };
  } catch {
    return { ok: false as const, status: 401 as const };
  }
}

export function withAdmin<Ctx = unknown>(
  handler: (req: NextRequest, ctx: Ctx) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: Ctx) => {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return NextResponse.json(
        { ok: false, error: auth.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' },
        { status: auth.status, headers: { 'Cache-Control': 'no-store' } },
      );
    return handler(req, ctx);
  };
}
