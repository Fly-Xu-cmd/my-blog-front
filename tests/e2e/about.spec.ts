import { test, expect } from "@playwright/test";

test("about saves update SSR body and metadata, and unsafe Markdown cannot execute", async ({
  request,
  browser,
}) => {
  const auth = await (
    await request.post("/api/login", {
      data: { username: "test-admin", password: "test-only" },
    })
  ).json();
  const headers = { Authorization: "Bearer " + auth.data.token };
  const originalResponse = await request.get("/api/about?scope=admin", {
    headers,
  });
  expect(originalResponse.status()).toBe(200);
  const original = (await originalResponse.json()).data;
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const saved = await request.put("/api/about", {
      headers,
      data: {
        title: "认识若木 · E2E",
        subtitle: "新的全栈实践介绍",
        content:
          '大家好呀！这是更新后的关于页。\n\n## 技术实践\n\n**React 与 TypeScript**\n\n<script>window.aboutAttack=1</script>\n\n<img src=x onerror="window.aboutAttack=2">\n\n[危险链接](javascript:alert(1))',
        revision: original.revision,
      },
    });
    expect(saved.status()).toBe(200);
    const page = await context.newPage();
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "认识若木 · E2E",
    );
    await expect(page.locator(".article-content")).toContainText(
      "这是更新后的关于页",
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "新的全栈实践介绍",
    );
    await expect(page).toHaveTitle(/认识若木 · E2E/);
    await expect(
      page.locator(".article-content script, .article-content img"),
    ).toHaveCount(0);
    await expect(page.locator(".article-content a")).not.toHaveAttribute(
      "href",
      /javascript:/,
    );
    const jsContext = await browser.newContext();
    try {
      const jsPage = await jsContext.newPage();
      await jsPage.goto("/about");
      expect(await jsPage.evaluate(() => "aboutAttack" in window)).toBe(false);
    } finally {
      await jsContext.close();
    }
  } finally {
    await context.close();
    const latest = (
      await (await request.get("/api/about?scope=admin", { headers })).json()
    ).data;
    const restore = await request.put("/api/about", {
      headers,
      data: {
        title: original.title,
        subtitle: original.subtitle,
        content: original.content,
        revision: latest.revision,
      },
    });
    expect(restore.status()).toBe(200);
  }
});
