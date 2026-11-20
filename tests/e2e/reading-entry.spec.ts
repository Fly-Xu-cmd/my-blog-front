import { test, expect } from "@playwright/test";
test("reading entry renders curated public content and hides unpublished choices", async ({
  request,
  page,
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
      await request.get("/api/reading-entry?scope=admin", { headers })
    ).json()
  ).data;
  const post = (
    await (
      await request.get("/api/posts/e2e-public?scope=admin", { headers })
    ).json()
  ).data;
  const series = (
    await (await request.get("/api/series", { headers })).json()
  ).data.find((s: { slug: string }) => s.slug === "e2e-series");
  try {
    expect(
      (
        await request.put("/api/reading-entry", {
          headers,
          data: {
            revision: original.revision,
            featuredPostId: post.id,
            startPostIds: [post.id],
            recommendedSeriesIds: [series.id],
          },
        })
      ).status(),
    ).toBe(200);
    await page.goto("/");
    const section = page.getByRole("region", { name: "从这里开始" });
    await expect(section).toContainText("E2E Public");
    await expect(
      section.getByRole("link", { name: /E2E Series/ }),
    ).toHaveAttribute("href", "/series/e2e-series");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await request.put("/api/posts/e2e-public", {
          headers,
          data: { published: false },
        })
      ).status(),
    ).toBe(200);
    await page.reload();
    await expect(page.getByRole("region", { name: "从这里开始" })).toHaveCount(
      0,
    );
    expect(
      await (await request.get("/api/reading-entry")).text(),
    ).not.toContain("E2E Public");
  } finally {
    await request.put("/api/posts/e2e-public", {
      headers,
      data: { published: true },
    });
    const latest = (
      await (
        await request.get("/api/reading-entry?scope=admin", { headers })
      ).json()
    ).data;
    await request.put("/api/reading-entry", {
      headers,
      data: { ...original, revision: latest.revision },
    });
  }
});
test("admin can search for a public article and configure the featured reading entry", async ({
  page,
  request,
}) => {
  test.skip(!process.env.ADMIN_E2E_DIR, "Requires paired admin");
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
      await request.get("/api/reading-entry?scope=admin", { headers })
    ).json()
  ).data;
  try {
    await page.goto("http://127.0.0.1:8000/user/login");
    await page.getByLabel("用户名").fill("test-admin");
    await page.getByLabel("密码", { exact: true }).fill("test-only");
    await page.getByRole("button", { name: /登\s*入/ }).click();
    await expect(page).toHaveURL(/welcome/);
    await page.goto("http://127.0.0.1:8000/manage/reading-entry");
    const chooser = page.getByRole("combobox", {
      name: "主推文章",
      exact: true,
    });
    await chooser.click();
    await expect(
      page
        .locator(
          ".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option",
        )
        .first(),
    ).toBeVisible();
    await chooser.fill("not-found-reading-choice-unique");
    await expect(
      page.locator(
        ".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option",
      ),
    ).toHaveCount(0);
    await page
      .getByRole("combobox", { name: "主推文章", exact: true })
      .fill("E2E Public");
    await page
      .locator(".ant-select-item-option-content")
      .filter({ hasText: /^E2E Public$/ })
      .click();
    await page.getByRole("button", { name: "保存阅读入口" }).click();
    await expect(
      page.getByText("阅读入口已更新", { exact: true }),
    ).toBeVisible();
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "从这里开始" }),
    ).toContainText("E2E Public");
  } finally {
    const latest = (
      await (
        await request.get("/api/reading-entry?scope=admin", { headers })
      ).json()
    ).data;
    await request.put("/api/reading-entry", {
      headers,
      data: { ...original, revision: latest.revision },
    });
  }
});
