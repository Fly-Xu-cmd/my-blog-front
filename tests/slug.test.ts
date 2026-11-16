import { describe, it, expect, vi } from 'vitest';
import { baseSlug, createWithSlug, manualSlug } from '@/lib/slug';
import { safeJson, markdownHeadings } from '@/lib/markdown';
import { pagination } from '@/lib/api';
const duplicate = { code: 'P2002', meta: { target: 'Post_slug_key' } };
describe('slug allocation', () => {
  it('normalizes mixed Chinese/Latin, accents and bounds length', () => {
    expect(baseSlug('你好 React 19', 'post')).toBe('ni-hao-react-19');
    expect(baseSlug('Café', 'post')).toBe('cafe');
    expect(baseSlug('你好'.repeat(100), 'post').length).toBeLessThanOrEqual(120);
    expect(baseSlug('🔥', 'post')).toMatch(/^post-[0-9a-f]{8}$/);
  });
  it('attempts exact base before suffixes', async () => {
    const create = vi.fn(async (slug) => slug);
    expect(await createWithSlug('React', 'post', undefined, create)).toBe('react');
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('bounds retries and only retries slug uniqueness', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(duplicate)
      .mockRejectedValueOnce(duplicate)
      .mockResolvedValue('ok');
    expect(await createWithSlug('React', 'post', undefined, create)).toBe('ok');
    expect(create.mock.calls.map((c) => c[0])).toEqual(['react', 'react-2', 'react-3']);
    const fail = vi.fn().mockRejectedValue(duplicate);
    await expect(createWithSlug('React', 'post', undefined, fail)).rejects.toMatchObject({
      code: 'SLUG_CONFLICT',
    });
    expect(fail).toHaveBeenCalledTimes(5);
    const tag = vi.fn().mockRejectedValue({ code: 'P2002', meta: { target: 'Tag_name_key' } });
    await expect(createWithSlug('React', 'post', undefined, tag)).rejects.toMatchObject({
      meta: { target: 'Tag_name_key' },
    });
    expect(tag).toHaveBeenCalledTimes(1);
  });
  it('manual collision does not rename; reserved and unsafe input rejected', async () => {
    await expect(
      createWithSlug('Title', 'post', 'taken', async () => {
        throw duplicate;
      }),
    ).rejects.toMatchObject({ code: 'SLUG_CONFLICT' });
    expect(() => manualSlug('../bad')).toThrow();
    await expect(createWithSlug('meta', 'note', 'meta', async (s) => s)).rejects.toMatchObject({
      code: 'RESERVED_SLUG',
    });
  });
});
describe('HTML and paging', () => {
  it('escapes script terminators without corrupting JSON', () => {
    const input = { title: '</script><script>alert(1)</script>' };
    const encoded = safeJson(input);
    expect(encoded).not.toContain('<');
    expect(JSON.parse(encoded)).toEqual(input);
  });
  it('uses unique heading positions and excludes code fences', () => {
    const h = markdownHeadings('# 标题\n\n## **重复**\n\n## **重复**\n\n~~~\n# not a heading\n~~~');
    expect(h).toHaveLength(3);
    expect(new Set(h.map((v) => v.id)).size).toBe(3);
    expect(h[1].title).toBe('重复');
  });
  it('validates paging and legacy size', () => {
    expect(pagination(new URLSearchParams('size=20&pageSize=5')).take).toBe(5);
    expect(() => pagination(new URLSearchParams('pageSize=51'))).toThrow();
    expect(() => pagination(new URLSearchParams('current=1.5'))).toThrow();
  });
});
