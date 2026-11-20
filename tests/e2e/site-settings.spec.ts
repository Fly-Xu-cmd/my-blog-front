import { test, expect } from "@playwright/test";

test("configured site identity updates SSR metadata, RSS and contacts without JavaScript", async ({
  request,
  browser,
}) => {
  const auth = (
    await (
      await request.post("/api/login", {
        data: { username: "test-admin", password: "test-only" },
      })
    ).json()
  ).data;
  const headers = { Authorization: "Bearer " + auth.token };
  const original = (
    await (
      await request.get("/api/site-settings?scope=admin", { headers })
    ).json()
  ).data;
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    expect(
      (
        await request.put("/api/site-settings", {
          headers,
          data: {
            revision: original.revision,
            name: "新的站点 & <名字>",
            author: "新作者",
            homeTitle: "这里开始阅读",
            homeIntro: "更新后的首页介绍",
            email: "hello@example.com",
            github: "",
            wechatQr: "",
            qqQr: "",
          },
        })
      ).status(),
    ).toBe(200);
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "这里开始阅读",
    );
    await expect(page.locator("main")).toContainText("更新后的首页介绍");
    await expect(page.getByRole("link", { name: "邮件联系" })).toHaveAttribute(
      "href",
      "mailto:hello@example.com",
    );
    await expect(
      page.getByRole("link", { name: "GitHub", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "微信二维码", exact: true }),
    ).toHaveCount(0);
    await page.goto("/posts/e2e-public");
    await expect(page).toHaveTitle(/新的站点 & <名字>/);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      "content",
      "新的站点 & <名字>",
    );
    expect(
      await page
        .locator('script[type="application/ld+json"]')
        .allTextContents(),
    ).toContainEqual(expect.stringContaining("新作者"));
    expect(await (await request.get("/feed.xml")).text()).toContain(
      "新的站点 &amp; &lt;名字&gt;",
    );
    await page.goto("/subscribe");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /新的站点/,
    );
  } finally {
    await context.close();
    const latest = (
      await (
        await request.get("/api/site-settings?scope=admin", { headers })
      ).json()
    ).data;
    expect(
      (
        await request.put("/api/site-settings", {
          headers,
          data: { ...original, revision: latest.revision },
        })
      ).status(),
    ).toBe(200);
  }
});

test("paired admin saves site identity and a subsequent page receives the new configuration", async ({
  page,
  request,
}) => {
  test.skip(!process.env.ADMIN_E2E_DIR, "Requires paired isolated admin");
  const auth = (
    await (
      await request.post("/api/login", {
        data: { username: "test-admin", password: "test-only" },
      })
    ).json()
  ).data;
  const headers = { Authorization: "Bearer " + auth.token };
  const original = (
    await (
      await request.get("/api/site-settings?scope=admin", { headers })
    ).json()
  ).data;
  try {
    await page.goto("http://127.0.0.1:8000/user/login");
    await page.getByLabel("用户名").fill("test-admin");
    await page.getByLabel("密码", { exact: true }).fill("test-only");
    await page.getByRole("button", { name: /登\s*入/ }).click();
    await expect(page).toHaveURL(/welcome/);
    await page.goto("http://127.0.0.1:8000/manage/site");
    await expect(page.getByLabel("站点名称", { exact: true })).toHaveValue(
      original.name,
    );
    await page.getByLabel("首页标题", { exact: true }).fill("配对后台配置首页");
    const preview = page.getByRole("region", { name: "前台位置预览画布" });
    await expect(
      preview.getByRole("heading", { name: "配对后台配置首页" }),
    ).toBeVisible();
    await expect(preview).not.toContainText(original.description);
    await page.getByText("手机", { exact: true }).click();
    await expect(
      preview.getByRole("heading", { name: "配对后台配置首页" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "保存并更新前台" }).click();
    await expect(
      page.getByText("站点配置已保存，前台已更新", { exact: true }),
    ).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "配对后台配置首页",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    const latest = (
      await (
        await request.get("/api/site-settings?scope=admin", { headers })
      ).json()
    ).data;
    await request.put("/api/site-settings", {
      headers,
      data: { ...original, revision: latest.revision },
    });
  }
});

test("admin overview and analytics show content status, period UV and titled links", async ({
  page,
  request,
}) => {
  test.skip(!process.env.ADMIN_E2E_DIR, "Requires paired isolated admin");
  await page.goto("http://127.0.0.1:8000/user/login");
  await page.getByLabel("用户名").fill("test-admin");
  await page.getByLabel("密码", { exact: true }).fill("test-only");
  await page.getByRole("button", { name: /登\s*入/ }).click();
  await expect(page).toHaveURL(/welcome/);
  await expect(page.getByText("已公开文章", { exact: true })).toBeVisible();
  await expect(page.getByText("最近编辑", { exact: true })).toBeVisible();
  await page.goto("http://127.0.0.1:8000/analysis");
  await expect(page.getByText(/UV 按浏览器标识估算/)).toBeVisible();
  await expect(
    page.getByText("范围内独立访客（UV）", { exact: true }),
  ).toBeVisible();
  await page.getByPlaceholder("开始日期").click();
  await page.getByText("近 30 天", { exact: true }).click();
  await expect(
    page.getByText("范围内 UV 整段时间去重", { exact: false }),
  ).toBeVisible();
  expect((await request.get("/api/admin/content-stats")).status()).toBe(401);
});

test("admin overview and analytics accept custom dates and calendar shortcuts", async ({
  page,
}) => {
  test.skip(!process.env.ADMIN_E2E_DIR, "Requires paired isolated admin");
  await page.goto("http://127.0.0.1:8000/user/login");
  await page.getByLabel("用户名").fill("test-admin");
  await page.getByLabel("密码", { exact: true }).fill("test-only");
  await page.getByRole("button", { name: /登\s*入/ }).click();
  await expect(page).toHaveURL(/welcome/);
  await expect(page).toHaveTitle(/总览/);
  for (const path of ["/welcome", "/analysis"]) {
    if (path !== "/welcome") await page.goto("http://127.0.0.1:8000" + path);
    const start = page.getByPlaceholder("开始日期"),
      end = page.getByPlaceholder("结束日期");
    await start.click();
    await page.getByText("本周", { exact: true }).click();
    await expect(start).not.toHaveValue("");
    await start.click();
    await page.getByText("本月", { exact: true }).click();
    await expect(start).toHaveValue(/-01$/);
    await start.fill("2000-02-28");
    await start.press("Enter");
    await end.fill("2000-03-01");
    await end.press("Enter");
    await expect(
      page.getByText(
        path === "/welcome"
          ? /趋势范围：2000-02-28 至 2000-03-01/
          : /当前展示 2000\/2\/28 至 2000\/3\/1/,
      ),
    ).toBeVisible();
  }
});
