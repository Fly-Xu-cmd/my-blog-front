import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("recent reading resumes automatically, search anchors take priority and storage denial preserves reading", async ({
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
  const headers = {
    Authorization: "Bearer " + auth.token,
    "Idempotency-Key": randomUUID(),
  };
  const slug = "resume-" + randomUUID();
  const made = await request.post("/api/posts", {
    headers,
    data: {
      title: "Resume article",
      slug,
      content: Array.from(
        { length: 45 },
        (_, i) =>
          "## Chapter " + i + "\n\n" + "Long paragraph readable. ".repeat(30),
      ).join("\n\n"),
      published: true,
    },
  });
  expect(made.ok()).toBe(true);
  const id = (await made.json()).data.id;
  try {
    await page.goto("/posts/" + slug);
    await page.locator(".article-content p").nth(12).scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem("blog-reading-position-v2") ??
                '{"items":[]}',
            ).items[0]?.ratio ?? 0,
        ),
      )
      .toBeGreaterThan(0.1);
    const saved = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("blog-reading-position-v2")!).items[0],
    );
    expect(saved.id).toBe(id);
    await page.goto("/");
    await page
      .getByRole("link", { name: "Resume article", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "已恢复上次阅读位置" }),
    ).toBeVisible();
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(500);
    // Establish a document entry, rather than a route pushed inside the home document.
    await page.goto('/posts/'+slug);
    await expect(page.locator('#article')).toBeVisible();
    await page.goto("/");
    await page.goBack();
    await expect(page).toHaveURL('/posts/'+slug);
    await expect(page.locator('#article')).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          (
            performance.getEntriesByType(
              "navigation",
            )[0] as PerformanceNavigationTiming
          ).type,
      ),
    ).toBe("back_forward");
    await page.getByRole("link", { name: "首页", exact: true }).first().click();
    await page
      .getByRole("link", { name: "Resume article", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "已恢复上次阅读位置" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "从头阅读" }).click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await page.locator(".article-content p").nth(18).scrollIntoViewIfNeeded();
    await page.goto("/");
    await page.goto("/posts/" + slug + "?highlight=Long#search-0");
    await expect(
      page.locator(".article-content .search-arrival"),
    ).toBeVisible();
    await expect(page.getByText("已恢复上次阅读位置")).toHaveCount(0);
    expect((await request.get("/reading")).status()).toBe(404);
    await expect(
      page.getByRole("button", { name: "稍后再读", exact: true }),
    ).toHaveCount(0);
    await page.addInitScript(() => {
      Object.defineProperty(Storage.prototype, "setItem", {
        value() {
          throw new DOMException("denied", "QuotaExceededError");
        },
      });
    });
    await page.goto("/posts/" + slug);
    await expect(page.locator(".article-content")).toContainText(
      "Long paragraph readable.",
    );
  } finally {
    await request.delete("/api/posts/" + slug, { headers });
  }
});
test("client-side departure flushes the latest original article position before destination DOM changes", async ({
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
  const headers = { Authorization: "Bearer " + auth.token };
  const slug = "depart-" + randomUUID();
  await request.post("/api/posts", {
    headers: { ...headers, "Idempotency-Key": randomUUID() },
    data: {
      title: "Departure article",
      slug,
      content: Array.from(
        { length: 55 },
        (_, i) => "## Chapter " + i + "\n\n" + "Long paragraph. ".repeat(45),
      ).join("\n\n"),
      published: true,
    },
  });
  try {
    await page.goto("/posts/" + slug);
    await page.locator(".article-content p").nth(6).scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem("blog-reading-position-v2") ??
                '{"items":[]}',
            ).items[0]?.ratio ?? 0,
        ),
      )
      .toBeGreaterThan(0.05);
    const captured = await page.evaluate(() => {
      const article = document.getElementById("article")!,
        p = article.querySelectorAll<HTMLElement>(".article-content p")[18];
      window.scrollTo({
        top: p.getBoundingClientRect().top + scrollY + 30,
        behavior: "instant",
      });
      window.dispatchEvent(new Event("scroll"));
      const ratio =
        (scrollY - (article.getBoundingClientRect().top + scrollY)) /
        (article.offsetHeight - innerHeight);
      const old = JSON.parse(localStorage.getItem("blog-reading-position-v2")!)
        .items[0].ratio;
      return { ratio, old };
    });
    expect(captured.ratio - captured.old).toBeGreaterThan(0.05);
    await page
      .getByRole("link", { name: "首页", exact: true })
      .first()
      .evaluate((link: HTMLAnchorElement) => link.click());
    await expect(page).toHaveURL("/");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("blog-reading-position-v2")!)
              .items[0].ratio,
        ),
      )
      .toBeCloseTo(captured.ratio, 2);
  } finally {
    await request.delete("/api/posts/" + slug, { headers });
  }
});
