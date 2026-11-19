import { test, expect } from "@playwright/test";
test.skip(!process.env.ADMIN_E2E_DIR, "Requires paired local admin build");

test("about editor persists fields, previews safely, updates public page, and disables saves after a failed read", async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  const auth = await (
    await request.post("/api/login", {
      data: { username: "test-admin", password: "test-only" },
    })
  ).json();
  const headers = { Authorization: "Bearer " + auth.data.token };
  const original = (
    await (await request.get("/api/about?scope=admin", { headers })).json()
  ).data;
  try {
    await page.goto("http://127.0.0.1:8000/user/login");
    await page.getByLabel("用户名").fill("test-admin");
    await page.getByLabel("密码", { exact: true }).fill("test-only");
    await page.getByRole("button", { name: /登\s*入/ }).click();
    await expect(page).toHaveURL(/welcome/);
    await page.goto("http://127.0.0.1:8000/manage/about");
    await expect(page.getByLabel("页面标题", { exact: true })).toHaveValue(
      original.title,
    );
    await page.screenshot({
      path: "test-results/about-admin.png",
      fullPage: true,
    });
    const preview = await page.context().newPage();
    await preview.goto("http://127.0.0.1:3197/about");
    await expect(preview.locator(".article-content")).toContainText(
      original.content.slice(0, 5),
    );
    await preview.screenshot({
      path: "test-results/about-front.png",
      fullPage: true,
    });
    await preview.setViewportSize({ width: 390, height: 844 });
    await preview.screenshot({
      path: "test-results/about-mobile.png",
      fullPage: true,
    });
    await preview.close();
    await page.getByLabel("页面标题", { exact: true }).fill("后台更新的关于我");
    await page
      .getByLabel("一句话介绍", { exact: true })
      .fill("后台编辑的全栈简介");
    await page
      .locator(".w-md-editor-text-input")
      .fill(
        "大家好呀！后台更新的正文。\n\n**技术与实践**\n\n<script>window.aboutAdminAttack=1</script>",
      );
    await expect(page.locator(".wmde-markdown")).toContainText(
      "后台更新的正文",
    );
    await expect(page.locator(".wmde-markdown script")).toHaveCount(0);
    expect(await page.evaluate(() => "aboutAdminAttack" in window)).toBe(false);
    await page.getByRole("button", { name: "保存并更新前台" }).click();
    await expect(page.getByText("关于页已保存，前台已更新")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("页面标题", { exact: true })).toHaveValue(
      "后台更新的关于我",
    );
    const publicPage = await page.context().newPage();
    await publicPage.goto("http://127.0.0.1:3197/about");
    await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(
      "后台更新的关于我",
    );
    await expect(publicPage.locator(".article-content")).toContainText(
      "后台更新的正文",
    );
    await publicPage.close();
    await page.route("**/api/about?scope=admin", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"ok":false,"error":"load unavailable"}',
      }),
    );
    await page.reload();
    await expect(page.getByText("关于页加载失败")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "保存并更新前台" }),
    ).toBeDisabled();
  } finally {
    const latest = (
      await (await request.get("/api/about?scope=admin", { headers })).json()
    ).data;
    expect(
      (
        await request.put("/api/about", {
          headers,
          data: {
            title: original.title,
            subtitle: original.subtitle,
            content: original.content,
            revision: latest.revision,
          },
        })
      ).status(),
    ).toBe(200);
  }
});
