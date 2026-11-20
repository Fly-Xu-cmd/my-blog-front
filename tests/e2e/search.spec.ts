import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
const openSearch = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  return page.getByLabel("搜索文章和笔记", { exact: true });
};
test("Unicode search offsets reach the correct paragraph after emoji and a long body window", async ({
  page,
  request,
}) => {
  const auth = (
    await (
      await request.post("/api/login", {
        data: { username: "test-admin", password: "test-only" },
      })
    ).json()
  ).data;
  const headers = { Authorization: "Bearer " + auth.token },
    slug = "unicode-" + randomUUID(),
    needle = "精确目标🌌" + randomUUID();
  const content =
    "## 星空 🌌\n\n开头段落。\n\n" +
    "🌌 星云很远。".repeat(1300) +
    "\n\n这是 İ" +
    needle +
    " 所在的目标段落。";
  expect(
    (
      await request.post("/api/posts", {
        headers: { ...headers, "Idempotency-Key": randomUUID() },
        data: {
          slug,
          title: "Unicode location fixture",
          content,
          published: true,
        },
      })
    ).ok(),
  ).toBe(true);
  try {
    const result = (
      await (
        await request.get("/api/search?q=" + encodeURIComponent(needle))
      ).json()
    ).data[0];
    expect(result.matchOffset).toBe(
      [...content.slice(0, content.indexOf(needle))].length,
    );
    expect(result.snippet).toContain(needle);
    const input = await openSearch(page);
    await input.fill(needle);
    await expect(page.getByRole("dialog").locator("mark").first()).toHaveText(
      needle,
    );
    await page
      .getByRole("dialog")
      .getByRole("link", { name: /Unicode location fixture/ })
      .click();
    await expect(
      page.locator(".article-content p.search-arrival"),
    ).toContainText(needle);
    await expect(
      page.locator(".article-content .search-arrival mark"),
    ).toHaveText(needle);
  } finally {
    await request.delete("/api/posts/" + slug, { headers });
  }
});
test("search dialog groups public results, highlights snippets and centres the matching paragraph", async ({
  page,
  request,
}) => {
  const input = await openSearch(page);
  await expect(page.getByText("从一个关键词开始")).toBeVisible();
  await input.fill("Readable server body");
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".search-results")).toContainText("E2E Public");
  await expect(dialog.locator("mark").first()).toHaveText(
    "Readable server body",
  );
  const link = dialog.getByRole("link", { name: /E2E Public/ });
  await expect(link).toHaveAttribute("href", /highlight=.*#search-\d+/);
  await link.click();
  await expect(page).toHaveURL(/\/posts\/e2e-public.*#search-/);
  const target = page.locator(".article-content .search-arrival");
  await expect(target).toContainText("Readable server body");
  await expect(target.locator("mark")).toHaveText("Readable server body");
  const box = await target.boundingBox();
  const viewport = page.viewportSize()!;
  expect(Math.abs(box!.y + box!.height / 2 - viewport.height / 2)).toBeLessThan(
    100,
  );
  await expect(target).toHaveCount(0, { timeout: 6000 });
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await page.getByLabel("搜索文章和笔记", { exact: true }).fill("中文标题");
    await page
      .getByRole("dialog")
      .getByRole("link", { name: /E2E Public/ })
      .click();
    await expect(page.locator(".article-content h2.search-arrival")).toHaveText(
      "中文标题",
    );
    await expect(
      page.locator(".article-content h2.search-arrival"),
    ).toHaveCount(0, { timeout: 6000 });
  }
  expect((await request.get("/search")).status()).toBe(404);
  expect(
    (await (await request.get("/api/search?q=E2E_PRIVATE_MARKER")).json())
      .total,
  ).toBe(0);
});
test("filters, keyboard selection and mobile dialog retain clear empty and failure states", async ({
  page,
}) => {
  const input = await openSearch(page);
  await input.fill("E2E");
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".search-results").first()).toBeVisible();
  await dialog.getByText(/^技术笔记 \d+$/).click();
  await expect(dialog.locator(".search-result-group")).toHaveCount(1);
  await expect(dialog.locator(".search-result-group h3")).toContainText(
    "技术笔记",
  );
  await input.fill("not-found-final-query");
  await expect(dialog.getByRole("status")).toHaveText(
    "“not-found-final-query” · 0 条结果",
  );
  await input.fill("E2E Technical Note");
  await expect(
    dialog.getByRole("link", { name: /E2E Technical Note/ }),
  ).toBeVisible();
  await page.route("**/api/search?**", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"ok":false}',
    }),
  );
  await input.fill("offline");
  await expect(dialog.getByRole("alert")).toContainText("搜索暂不可用");
  await expect(
    dialog.getByRole("link", { name: /E2E Technical Note/ }),
  ).toBeVisible();
  await page.unroute("**/api/search?**");
  await input.fill("E2E Technical Note");
  await expect(dialog.getByRole("status")).toContainText("E2E Technical Note");
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/notes\/e2e-tech-note/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("late search responses cannot overwrite a new query or reopen a closed dialog", async ({
  page,
}) => {
  const input = await openSearch(page);
  await page.route("**/api/search?**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("q") === "slow-query")
      await new Promise((r) => setTimeout(r, 800));
    await route.continue();
  });
  await input.fill("slow-query");
  await page.waitForRequest((r) => r.url().includes("q=slow-query"));
  await input.fill("not-found-final");
  await expect(page.getByRole("dialog").getByRole("status")).toHaveText(
    "“not-found-final” · 0 条结果",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
