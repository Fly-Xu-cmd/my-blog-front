import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message = code,
  ) {
    super(message);
  }
}
export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function admin(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) throw new ApiError(auth.status, auth.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN');
  if (!auth.username || !process.env.ADMIN_USERNAME || !process.env.JWT_SECRET)
    throw new ApiError(503, 'AUTH_UNAVAILABLE');
  return auth.username;
}
export async function adminScope(req: Request) {
  const scope = new URL(req.url).searchParams.get('scope');
  if (scope && scope !== 'admin') throw new ApiError(400, 'INVALID_SCOPE');
  if (scope === 'admin') {
    await admin(req);
    return true;
  }
  return false;
}
export function endpoint<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        const response = json(
          {
            ok: false,
            code: error.code,
            error: error.status === 429 ? '请求过于频繁' : error.message,
          },
          error.status,
        );
        if (error.status === 429) response.headers.set('Retry-After', error.message);
        return response;
      }
      const code = (error as { code?: string })?.code;
      if (code === 'P2002')
        return json({ ok: false, code: 'CONFLICT', error: '记录已存在或序号已占用' }, 409);
      if (code === 'P2025') return json({ ok: false, code: 'NOT_FOUND', error: '记录不存在' }, 404);
      console.error('API request failed', {
        name: error instanceof Error ? error.name : 'unknown',
        code,
      });
      return json(
        { ok: false, code: 'SERVICE_UNAVAILABLE', error: '服务暂不可用，请稍后重试' },
        503,
      );
    }
  };
}
export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const value = await req.json();
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error();
    return value;
  } catch {
    throw new ApiError(400, 'INVALID_JSON');
  }
}
export function textField(value: unknown, max: number, required = false): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || (required && !value.trim()) || value.length > max)
    throw new ApiError(400, 'INVALID_TEXT');
  return value.trim();
}
export function markdownField(value: unknown, required = false): string | undefined {
  textField(value, 4_000_000, required);
  return value as string | undefined;
}
export function booleanField(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new ApiError(400, 'INVALID_BOOLEAN');
  return value;
}
export function idField(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw new ApiError(400, 'INVALID_ID');
  return value;
}
export function pagination(params: URLSearchParams) {
  const current = Number(params.get('current') ?? '1');
  const pageSize = Number(params.get('pageSize') ?? params.get('size') ?? '10');
  if (
    !Number.isSafeInteger(current) ||
    current < 1 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 50 ||
    !Number.isSafeInteger((current - 1) * pageSize)
  )
    throw new ApiError(400, 'INVALID_PAGINATION');
  return { current, pageSize, skip: (current - 1) * pageSize, take: pageSize };
}
