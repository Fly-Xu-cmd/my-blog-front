import { test, expect } from "@playwright/test";
test("unified search filters public results with safe highlighting and mobile layout", async ({
  page,
  request,
  browser,
}) => {
  await page.goto("/search?q=Readable%20server%20body");
  await expect(page.locator(".search-results")).toContainText("E2E Public");
  await expect(page.locator(".search-results mark").first()).toHaveText(
    "Readable server body",
  );
  await page.getByText("技术笔记", { exact: true }).first().click();
  await expect(page).toHaveURL(/type=TECH/);
  await expect(
    page.getByRole("link", { name: "E2E Public", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("搜索文章和笔记", { exact: true })
    .fill("E2E_PRIVATE_MARKER");
  await page.getByRole("button", { name: /搜\s*索/ }).click();
  await expect(page.getByRole("status")).toContainText("0 条结果");
  expect(
    await (await request.get("/api/search?q=E2E_PRIVATE_MARKER")).text(),
  ).not.toContain("secret draft body");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const noJS = await context.newPage();
    await noJS.goto("/search?q=E2E%20Public&type=post");
    await expect(noJS.locator(".search-results")).toContainText("E2E Public");
  } finally {
    await context.close();
  }
});
test("search input escapes markup and quick successive navigation settles on the latest query", async ({
  page,
}) => {
  await page.goto("/search?q=%3Cscript%3E");
  await expect(page.locator(".search-results script")).toHaveCount(0);
  const input = page.getByLabel("搜索文章和笔记", { exact: true });
  await input.fill("E2E");
  await input.press("Enter");
  await input.fill("not-found-final-query");
  await input.press("Enter");
  await expect(page).toHaveURL(/not-found-final-query/);
  await expect(page.getByRole("status")).toHaveText(
    "“not-found-final-query” · 0 条结果",
  );
  await expect(page.locator(".search-results")).toHaveCount(0);
});

test("failed search preserves the last results and browser history restores successful queries", async ({
  page,
}) => {
  await page.goto("/search?q=Readable%20server%20body&type=post");
  const oldLink = page.getByRole("link", { name: "E2E Public", exact: true });
  await expect(oldLink).toBeVisible();
  const fail = (route: import("@playwright/test").Route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"ok":false}',
    });
  await page.route("**/api/search?**", fail);
  const input = page.getByLabel("搜索文章和笔记", { exact: true });
  await input.fill("unavailable-query");
  await input.press("Enter");
  await expect(page.locator("main").getByRole("alert")).toContainText("搜索暂不可用");
  await expect(oldLink).toBeVisible();
  await expect(page.locator(".search-results mark").first()).toHaveText(
    "Readable server body",
  );
  await expect(page.getByRole("status")).toContainText("Readable server body");
  await page.unroute("**/api/search?**", fail);
  await input.fill("not-found-history");
  await input.press("Enter");
  await expect(page.getByRole("status")).toHaveText(
    "“not-found-history” · 0 条结果",
  );
  await page.goBack();
  await expect(input).toHaveValue("unavailable-query");
  await expect(page.getByRole("status")).toHaveText(
    "“unavailable-query” · 0 条结果",
  );
  await page.goBack();
  await expect(input).toHaveValue("Readable server body");
  await expect(oldLink).toBeVisible();
  await page.goForward();
  await expect(input).toHaveValue("unavailable-query");
  await expect(page.getByRole("status")).toHaveText(
    "“unavailable-query” · 0 条结果",
  );
});
