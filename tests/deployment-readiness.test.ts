import { it, expect, vi } from 'vitest';
const query = vi.hoisted(() => vi.fn());
const realpath = vi.hoisted(() => vi.fn());
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: query } }));
vi.mock('node:fs', () => ({ realpathSync: realpath }));
import { GET } from '@/app/api/deployment/readiness/route';
it('returns only capabilities and rejects missing schema without leaking exception details', async () => {
  vi.stubEnv('JWT_SECRET', 'test-only'); vi.stubEnv('ADMIN_USERNAME', 'test'); vi.stubEnv('ADMIN_PASSWORD', 'test-only');
  try {
    query.mockResolvedValue([]);
    const ready = await GET(); expect(ready.status).toBe(200);
    expect(ready.headers.get('Cache-Control')).toBe('no-store');
    const data = await ready.json(); expect(data.capabilities).toContain('series-v1');
    expect(query).toHaveBeenCalledTimes(8);
    query.mockRejectedValue(new Error('SQL credentials private-draft'));
    const unavailable = await GET(); expect(unavailable.status).toBe(503);
    expect(await unavailable.text()).not.toContain('credentials');
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('BLOG_DEPLOY_ROOT', '/deployment');
    realpath.mockImplementation((value: string) => value.endsWith('current') ? 'old' : 'candidate');
    query.mockClear(); expect((await GET()).status).toBe(503); expect(query).not.toHaveBeenCalled();
    realpath.mockReturnValue('candidate'); query.mockResolvedValue([]);
    expect((await GET()).status).toBe(200);
    vi.stubEnv('JWT_SECRET', ''); query.mockClear();
    expect((await GET()).status).toBe(503); expect(query).not.toHaveBeenCalled();
  } finally { vi.unstubAllEnvs(); }
});
