import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
test('server body, duplicate Chinese anchors and Mermaid fallback survive disabled JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/posts/e2e-public');
  await expect(page.locator('article')).toContainText('Readable server body');
  const ids = await page
    .locator('article h2')
    .evaluateAll((nodes) => nodes.map((n) => n.id).filter(Boolean));
  expect(ids.length).toBe(2);
  expect(new Set(ids).size).toBe(2);
  for (const id of ids) await expect(page.locator('aside a[href="#' + id + '"]')).toHaveCount(1);
  await expect(page.locator('article')).toContainText('graph TD');
  await page.goto('/notes/e2e-note');
  await expect(page.locator('article')).toContainText('Note server body');
  await page.goto('/status/900001');
  await expect(page.locator('article')).toContainText('Dynamic server body');
  await context.close();
});
test('malicious Markdown and JSON-LD cannot execute scripts', async ({ page, request }) => {
  await page.goto('/posts/e2e-public');
  await expect(page.locator('article')).toContainText('Readable server body');
  expect(await page.evaluate(() => 'attack' in window)).toBe(false);
  await expect(
    page.locator('article script, article img[onerror], article a[href^="javascript:"]'),
  ).toHaveCount(0);
  const auth = await request.post('/api/login', {
    data: { username: 'test-admin', password: 'test-only' },
  });
  const token = (await auth.json()).data.token;
  const created = await request.post('/api/posts', {
    headers: { Authorization: 'Bearer ' + token, 'Idempotency-Key': randomUUID() },
    data: {
      title: '</script><script>window.attack=9</script>',
      slug: 'e2e-xss-' + randomUUID(),
      content: 'safe',
      published: true,
    },
  });
  expect(created.status()).toBe(200);
  const row = (await created.json()).data;
  await page.goto('/posts/' + row.slug);
  expect(await page.evaluate(() => 'attack' in window)).toBe(false);
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks.some((b) => JSON.parse(b).headline?.includes('</script>'))).toBe(true);
});
test('drafts remain absent from every public entry', async ({ request }) => {
  const response = await request.get('/posts/e2e-private');
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain('E2E_PRIVATE_MARKER');
  for (const route of [
    '/',
    '/allBlogs',
    '/api/posts',
    '/sitemap.xml',
  ])
    expect(await (await request.get(route)).text()).not.toContain('E2E_PRIVATE_MARKER');
  expect((await request.get('/api/posts/e2e-private?scope=admin')).status()).toBe(401);
});
test('server search, pagination and late search response preserve current results', async ({
  page,
  request,
}) => {
  const list = await (await request.get('/api/posts?q=E2E_SEARCH&pageSize=10')).json();
  expect(list.total).toBe(12);
  expect(list.data).toHaveLength(10);
  expect(list.data[0]).not.toHaveProperty('content');
  const second = await (await request.get('/api/posts?q=E2E_SEARCH&current=2&pageSize=10')).json();
  expect(second.data).toHaveLength(2);
  await page.goto('/allBlogs');
  await page.getByRole('textbox', { name: '搜索标题或正文' }).fill('E2E_SEARCH');
  await expect(page.getByRole('status').filter({ hasText: '12 条内容' })).toBeVisible();
  await page.getByRole('button', { name: '下一页' }).click();
  await expect(page.locator('article').filter({ hasText: 'E2E_SEARCH' })).toHaveCount(2);
  await page.route('**/api/posts?**', async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch();
    if (url.searchParams.get('q') === 'E2E_SEARCH') await new Promise((r) => setTimeout(r, 600));
    await route.fulfill({ response }).catch(() => {});
  });
  await page.getByRole('textbox', { name: '搜索标题或正文' }).fill('E2E_SEARCH');
  await page.waitForTimeout(300);
  await page.getByRole('textbox', { name: '搜索标题或正文' }).fill('E2E Public');
  await expect(page.locator('article').filter({ hasText: 'E2E Public' })).toHaveCount(1);
  await expect(page.locator('article').filter({ hasText: 'E2E_SEARCH' })).toHaveCount(0);
});
test('real HTTP sync uses separate credentials and never republishes hidden content', async ({
  request,
}) => {
  const data = {
    syncId: 'http-' + randomUUID(),
    slug: 'http-' + randomUUID(),
    title: 'HTTP sync',
    content: 'body',
    hash: 'hash',
  };
  expect((await request.post('/api/notes/sync', { data })).status()).toBe(401);
  const logged = await (
    await request.post('/api/login', { data: { username: 'test-admin', password: 'test-only' } })
  ).json();
  expect(
    (
      await request.post('/api/notes/sync', {
        headers: { Authorization: 'Bearer ' + logged.data.token },
        data,
      })
    ).status(),
  ).toBe(401);
  const headers = { Authorization: 'Bearer local-sync-test-secret' };
  expect((await request.post('/api/notes/sync', { headers, data })).status()).toBe(200);
  expect((await request.get('/api/notes/' + data.slug)).status()).toBe(404);
  expect(
    (
      await request.post('/api/notes/sync', { headers, data: { ...data, published: true } })
    ).status(),
  ).toBe(400);
  expect((await request.get('/api/notes/meta')).status()).toBe(401);
});
