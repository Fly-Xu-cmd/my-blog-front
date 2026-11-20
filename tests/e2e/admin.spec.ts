import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
test.skip(
  !process.env.ADMIN_E2E_DIR,
  'Set ADMIN_E2E_DIR after local admin build to run paired acceptance',
);
test('admin login, draft CRUD, full-detail failure and publication workflow', async ({
  page,
  request,
}) => {
  await page.goto('http://127.0.0.1:8000/user/login');
  await page.getByLabel('用户名').fill('test-admin');
  await page.getByLabel('密码', { exact: true }).fill('test-only');
  await page.getByRole('button', { name: /登\s*入/ }).click();
  await expect(page).toHaveURL(/welcome/);
  await page.goto('http://127.0.0.1:8000/manage/post');
  await page.getByRole('button', { name: '新增文章' }).click();
  test.setTimeout(60000);
  const drawer = page.locator('.ant-drawer-content');
  const title = 'Admin E2E ' + randomUUID();
  await drawer.getByLabel('标题').fill(title);
  await drawer
    .locator('.w-md-editor-text-input')
    .fill(
      '## Admin body\n\n<script>window.adminAttack=1</script>\n\n<img src=x onerror="window.adminAttack=2">\n\nAdmin draft正文',
    );
  await expect(drawer.locator('script')).toHaveCount(0);
  expect(await page.evaluate(() => 'adminAttack' in window)).toBe(false);
  await drawer.getByRole('button', { name: /保\s*存/ }).click();
  await expect(drawer).not.toBeVisible();
  const row = page.getByRole('row').filter({ hasText: title });
  await expect(row).toBeVisible();
  await expect(row).toContainText('私有');
  await row.getByText('编辑', { exact: true }).click();
  await expect(drawer.locator('.w-md-editor-text-input')).toHaveValue(/Admin draft正文/);
  await drawer.getByLabel('标题').fill(title + ' edited');
  await drawer.getByRole('button', { name: /保\s*存/ }).click();
  const edited = page.getByRole('row').filter({ hasText: title + ' edited' });
  await expect(edited).toBeVisible();
  await edited.getByText('发布', { exact: true }).click();
  await expect(edited).toContainText('公开');
  const auth = await (
    await request.post('/api/login', { data: { username: 'test-admin', password: 'test-only' } })
  ).json();
  const result = await (
    await request.get('/api/posts?scope=admin&q=' + encodeURIComponent(title), {
      headers: { Authorization: 'Bearer ' + auth.data.token },
    })
  ).json();
  const slug = result.data[0].slug;
  expect((await request.get('/api/posts/' + slug)).status()).toBe(200);
  await edited.getByText('隐藏', { exact: true }).click();
  await expect(edited).toContainText('私有');
  expect((await request.get('/api/posts/' + slug)).status()).toBe(404);
  let writes = 0;
  page.on('request', (req) => {
    if (req.method() === 'PUT') writes++;
  });
  await page.route('**/api/posts/' + slug + '?scope=admin', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"ok":false,"error":"detail unavailable"}',
    }),
  );
  await edited.getByText('编辑', { exact: true }).click();
  await expect(page.getByText('detail unavailable', { exact: true })).toBeVisible();
  await expect(drawer).not.toBeVisible();
  expect(writes).toBe(0);
  await edited.getByText('删除', { exact: true }).click();
  await page.getByRole('button', { name: /确\s*定|OK/ }).click();
  await expect(edited).toHaveCount(0);
  await page.goto('http://127.0.0.1:8000/manage/note');
  await expect(page.getByText('笔记管理', { exact: true }).first()).toBeVisible();
  await page.getByLabel('标题').fill('E2E Note');
  await page.getByRole('button', { name: /Query|查\s*询/ }).click();
  await page
    .getByRole('row')
    .filter({ hasText: 'E2E Note' })
    .getByText('预览与设置', { exact: true })
    .click();
  await expect(drawer.getByRole('region', { name: 'E2E Note' })).toContainText('Note server body');
  const settings = drawer.getByRole('complementary', { name: '发布设置' });
  await expect(settings.getByRole('combobox', { name: '笔记类型' })).toBeVisible();
  await expect(settings.getByRole('switch', { name: '公开发布' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(settings).toBeVisible();
  expect(await drawer.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});
