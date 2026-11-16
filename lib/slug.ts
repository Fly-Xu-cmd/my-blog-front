import { randomBytes } from 'crypto';
import { pinyin } from 'pinyin-pro';
import { ApiError } from './api';
export function baseSlug(title: string, resource: string) {
  const latin = pinyin(title.normalize('NFKC'), { toneType: 'none', nonZh: 'consecutive' })
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
  return latin || resource + '-' + randomBytes(4).toString('hex');
}
export function manualSlug(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))
    throw new ApiError(400, 'INVALID_SLUG');
  return value;
}
export function isUniqueOn(error: unknown, field: string) {
  const e = error as { code?: string; meta?: { target?: string | string[] } };
  const target = e?.meta?.target;
  return (
    e?.code === 'P2002' &&
    (Array.isArray(target)
      ? target.length === 1 && target[0] === field
      : typeof target === 'string' && new RegExp('(?:^|_)' + field + '(?:_key)?$').test(target))
  );
}
export async function createWithSlug<T>(
  title: string,
  resource: string,
  supplied: unknown,
  create: (slug: string) => Promise<T>,
) {
  const explicit = manualSlug(supplied);
  let base = explicit ?? baseSlug(title, resource);
  if (resource === 'note' && ['meta', 'sync', 'delete', 'auth'].includes(base)) {
    if (explicit) throw new ApiError(400, 'RESERVED_SLUG');
    base += '-note';
  }
  for (let attempt = 0; attempt < (explicit ? 1 : 5); attempt++) {
    const candidate =
      attempt === 0
        ? base
        : base + '-' + (attempt < 3 ? attempt + 1 : randomBytes(4).toString('hex'));
    try {
      return await create(candidate);
    } catch (error) {
      if (!isUniqueOn(error, 'slug')) throw error;
    }
  }
  throw new ApiError(409, 'SLUG_CONFLICT', '链接已占用，请修改 slug 后重试');
}
