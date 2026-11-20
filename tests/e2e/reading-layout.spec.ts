import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("article without headings has no empty TOC and keeps a centred reading column", async ({
  page,
}) => {
  await page.goto("/notes/e2e-note");
  await expect(page.getByText("文章目录", { exact: true })).toHaveCount(0);
  const column = page.locator(".article-without-toc");
  const box = await column.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(860);
  expect(
    Math.abs(box!.x + box!.width / 2 - page.viewportSize()!.width / 2),
  ).toBeLessThan(3);
});
test("removing the featured article preserves the start section boundary and other choices", async ({
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
  const slug = "featured-delete-" + randomUUID();
  const featured = (
    await (
      await request.post("/api/posts", {
        headers: { ...headers, "Idempotency-Key": randomUUID() },
        data: {
          slug,
          title: "Temporary featured",
          content: "body",
          published: true,
        },
      })
    ).json()
  ).data;
  try {
    expect(
      (
        await request.put("/api/reading-entry", {
          headers,
          data: {
            revision: original.revision,
            featuredPostId: featured.id,
            startPostIds: [post.id],
            recommendedSeriesIds: [],
          },
        })
      ).ok(),
    ).toBe(true);
    expect((await request.delete("/api/posts/" + slug, { headers })).ok()).toBe(
      true,
    );
    await page.goto("/");
    const section = page.getByRole("region", { name: "从这里开始" });
    await expect(section).toBeVisible();
    await expect(section).toContainText("E2E Public");
    await expect(section).not.toContainText("Temporary featured");
    expect(
      await section.locator(".editorial-section-head").evaluate((n) => getComputedStyle(n).borderBottomWidth),
    ).toBe("2px");
    expect(await page.locator('section[aria-labelledby="recent-posts"] > .editorial-section-head').evaluate((n) => getComputedStyle(n).borderBottomWidth)).toBe("2px");
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
    await request.delete("/api/posts/" + slug, { headers });
  }
});
