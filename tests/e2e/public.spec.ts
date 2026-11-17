import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('night sky keeps meteors occasional and stops motion when preferences change', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2026-11-17T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-17T00:00:01Z'));
  await page.goto('/posts/e2e-public');
  const background = page.locator('.site-background');
  await expect(background).toHaveAttribute('data-motion', 'active');
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.clock.fastForward(19000);
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.clock.fastForward(21000);
  await expect(page.locator('.meteor')).toHaveCount(1);
  await page.clock.fastForward(1500);
  await expect(page.locator('.meteor')).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(background).toHaveAttribute('data-motion', 'paused');
  await expect(page.locator('.responsive-sky')).toHaveAttribute('data-renderer', 'static');
  await page.clock.fastForward(40000);
  await expect(page.locator('.meteor')).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' });
  await expect(page.locator('.night-sky')).toBeHidden();
  await page.clock.fastForward(40000);
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('.night-sky')).toBeVisible();
  await page.clock.fastForward(40000);
  await expect(page.locator('.meteor')).toHaveCount(1);
});

test('sky responds locally and reserves click meteors for blank-space gestures', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2026-11-17T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-17T00:00:01Z'));
  await page.goto('/archive');
  const sky = page.locator('.responsive-sky');
  await expect(sky).toHaveAttribute('data-renderer', /webgl|fallback/);
  await page.mouse.move(1200, 500);
  await page.clock.runFor(500);
  await expect(sky).toHaveAttribute('data-field', 'responding');
  await page.mouse.click(1200, 500);
  await expect(page.locator('.meteor[data-source="interaction"]')).toHaveCount(1);
  await page.clock.fastForward(1500);
  await page.mouse.click(1200, 500);
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.clock.fastForward(7000);
  await page.getByRole('heading', { name: '文章归档', exact: true }).click();
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.evaluate(() => {
    const selection = getSelection();
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('h1')!);
    selection?.removeAllRanges(); selection?.addRange(range);
  });
  await page.mouse.click(1200, 500);
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.mouse.move(1200, 500); await page.mouse.down();
  await page.mouse.move(1100, 600, { steps: 4 }); await page.mouse.up();
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.evaluate(() => getSelection()?.removeAllRanges());
  await page.mouse.click(1200, 500);
  await expect(page.locator('.meteor[data-source="interaction"]')).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(sky).toHaveAttribute('data-renderer', 'static');
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.mouse.click(1200, 500);
  await expect(page.locator('.meteor')).toHaveCount(0);
});


test('component surfaces and popup dismissal consume clicks before the sky', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
  await page.goto('/allBlogs');
  await expect(page.locator('.responsive-sky')).toHaveAttribute('data-renderer', /webgl|fallback/);
  await page.getByRole('button', { name: '切换主题' }).click();
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.mouse.click(1250, 650);
  await expect(page.locator('.ant-dropdown')).toBeHidden();
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.getByRole('button', { name: '筛选', exact: true }).click();
  await page.locator('.ant-popover-inner').click({ position: { x: 6, y: 6 } });
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.locator('.ant-select-selector').first().click({ position: { x: 2, y: 16 } });
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.getByRole('combobox', { name: '分类', exact: true }).click();
  await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').click({ position: { x: 2, y: 2 } });
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.mouse.click(1250, 650);
  await expect(page.locator('.ant-popover')).toBeHidden();
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.mouse.click(1250, 650);
  await expect(page.locator('.meteor[data-source=interaction]')).toHaveCount(1);
});

test('sky falls back without WebGL and touch scrolling does not launch meteors', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 }, colorScheme: 'dark', reducedMotion: 'no-preference' });
  await context.addInitScript(`const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return type === 'webgl' ? null : get.call(this, type, ...args);
    };`);
  const page = await context.newPage();
  await page.goto('/archive');
  await expect(page.locator('.responsive-sky')).toHaveAttribute('data-renderer', 'fallback');
  await page.dispatchEvent('section', 'pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true, button: 0, clientX: 5, clientY: 500 });
  await page.dispatchEvent('section', 'pointermove', { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: 5, clientY: 400 });
  await page.dispatchEvent('section', 'pointercancel', { pointerType: 'touch', pointerId: 1 });
  await expect(page.locator('.meteor')).toHaveCount(0);
  await page.touchscreen.tap(5, 500);
  await expect(page.locator('.meteor[data-source="interaction"]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await context.close();
});

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
    '/feed.xml',
    '/archive',
    '/sitemap.xml',
    '/tags/E2E%20Public%20Tag',
    '/series/e2e-series',
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

test('editorial indexes retain covers, note filters and recoverable search failures', async ({
  page,
  browser,
  request,
}) => {
  const auth = await request.post('/api/login', {
    data: { username: 'test-admin', password: 'test-only' },
  });
  expect(auth.ok()).toBe(true);
  const token = (await auth.json()).data.token;
  for (const cover of [null, '/imgs/head-img.jpg', '/imgs/head-img.jpg']) {
    const created = await request.post('/api/posts', {
      headers: { Authorization: 'Bearer ' + token, 'Idempotency-Key': randomUUID() },
      data: {
        title: 'Editorial cover fixture',
        slug: 'e2e-cover-' + randomUUID(),
        content: 'Editorial cover body',
        excerpt: 'Editorial cover summary',
        cover,
        published: true,
      },
    });
    expect(created.status()).toBe(200);
  }
  await page.goto('/allBlogs');
  await expect(page.locator('.editorial-feature')).toHaveCount(1);
  await expect(page.locator('main article')).toHaveCount(10);
  await expect(page.locator('.editorial-feature-cover img')).toBeVisible();
  await expect(page.locator('.editorial-article-row.has-cover img').first()).toBeVisible();
  await expect(page.locator('.editorial-article-row:not(.has-cover) img')).toHaveCount(0);
  await page.getByRole('textbox', { name: '搜索标题或正文' }).fill('E2E_KEYBOARD');
  await expect(page.getByRole('status').filter({ hasText: '21 条内容' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '搜索标题或正文' })).toHaveCSS(
    'outline-style',
    'none',
  );
  await expect(page.locator('.editorial-search')).toHaveCSS('box-shadow', 'none');
  const pagination = page.getByRole('navigation', { name: '分页', exact: true });
  const next = pagination.getByRole('button', { name: '下一页' });
  for (let i = 0; i < 50; i++) {
    await page.keyboard.press('Tab');
    if (await next.evaluate((button) => button === document.activeElement)) break;
  }
  await expect(next).toBeFocused();
  await pagination.getByRole('button', { name: '下一页' }).press('Enter');
  await expect(pagination).toContainText(/2\s*\/\s*3/);
  await expect(page.locator('main article')).toHaveCount(10);
  await page.route('**/api/posts?**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  await pagination.getByRole('button', { name: '下一页' }).click();
  await expect(pagination.getByRole('button', { name: '下一页' })).toBeDisabled();
  await expect(pagination.getByRole('button', { name: '上一页' })).toBeDisabled();
  await expect(page.locator('main article')).toHaveCount(1);
  await page.unroute('**/api/posts?**');
  await page.getByRole('button', { name: '清除筛选' }).click();
  let failed = false;
  await page.route('**/api/posts?**', async (route) => {
    if (!failed && new URL(route.request().url()).searchParams.get('q') === 'E2E_SEARCH') {
      failed = true;
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' });
    } else await route.continue();
  });
  await page.getByRole('textbox', { name: '搜索标题或正文' }).fill('E2E_SEARCH');
  await expect(page.locator('main').getByRole('alert')).toContainText('加载失败');
  await page.getByRole('button', { name: '重新加载' }).click();
  await expect(page.getByRole('status').filter({ hasText: '12 条内容' })).toBeVisible();
  await expect(page.locator('.editorial-feature')).toHaveCount(0);
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);

  await page.getByRole('button', { name: '清除筛选' }).click();
  await page.getByRole('button', { name: '筛选', exact: true }).click();
  await page.getByRole('combobox', { name: '分类', exact: true }).fill('E2E Category');
  await page.getByRole('combobox', { name: '分类', exact: true }).press('Enter');
  await expect(page.locator('main article')).toHaveCount(1);
  await expect(page.locator('main article')).toContainText('E2E Public');
  await page.getByRole('combobox', { name: '标签', exact: true }).fill('E2E Public Tag');
  await page.getByRole('combobox', { name: '标签', exact: true }).press('Enter');
  await expect(page.locator('main article')).toHaveCount(1);
  await page.getByRole('heading', { name: '博客', exact: true }).click();
  await page.getByRole('button', { name: '清除筛选' }).click();
  await expect(page.locator('.editorial-feature')).toHaveCount(1);
  for (const route of ['/', '/allBlogs', '/notes', '/allStatus']) {
    await page.goto(route);
    await expect(page.locator('main')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  }

  await page.goto('/notes');
  await page.getByRole('textbox', { name: '搜索标题或正文' }).fill('E2E');
  await page.locator('.ant-segmented-item-label').getByText('生活随笔', { exact: true }).click();
  await expect(page.getByRole('radio', { name: '生活随笔', exact: true })).toBeChecked();
  await expect(page.locator('.editorial-note-row')).toHaveCount(1);
  await expect(page.locator('.editorial-note-row')).toContainText('E2E Note');
  await page.locator('.ant-segmented-item-label').getByText('技术笔记', { exact: true }).click();
  await expect(page.getByRole('radio', { name: '技术笔记', exact: true })).toBeChecked();
  await expect(page.locator('.editorial-note-row')).toHaveCount(1);
  await expect(page.locator('.editorial-note-row')).toContainText('E2E Technical Note');
  await page.goto('/allStatus');
  await expect(page.locator('.editorial-timeline')).toBeVisible();

  const context = await browser.newContext({ javaScriptEnabled: false });
  const serverPage = await context.newPage();
  await serverPage.goto('/');
  await expect(serverPage.getByRole('heading', { name: '最近写下', exact: true })).toBeVisible();
  await expect(serverPage.getByRole('heading', { name: '最近的笔记', exact: true })).toBeVisible();
  await expect(serverPage.getByRole('heading', { name: '最近动态', exact: true })).toBeVisible();
  await expect(serverPage.locator('.editorial-feature-cover img')).toBeVisible();
  await serverPage.goto('/notes');
  await expect(serverPage.locator('style[data-antd-ssr]').first()).toBeAttached();
  await expect(serverPage.locator('.ant-segmented-group')).toHaveCSS('display', 'flex');
  await expect(serverPage.locator('.ant-segmented-item-input').first()).toHaveCSS('opacity', '0');
  await context.close();
});
