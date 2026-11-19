import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("reading location offers explicit resume and saved lists survive refresh and clear", async ({
  page,
  request,
}) => {
  const post = (await (await request.get("/api/posts/e2e-public")).json()).data;
  await page.addInitScript(
    ({ id }) =>
      !localStorage.getItem("blog-reading-v1") &&
      localStorage.setItem(
        "blog-reading-v1",
        JSON.stringify({
          version: 1,
          items: [
            {
              kind: "post",
              id,
              saved: false,
              visitedAt: Date.now(),
              ratio: 0.5,
              heading: "",
            },
          ],
        }),
      ),
    { id: post.id },
  );
  await page.goto("/posts/e2e-public");
  await expect(
    page.getByRole("button", { name: /继续上次阅读/ }),
  ).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.getByRole("button", { name: "稍后再读", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "已加入稍后再读", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/reading");
  await page.getByText("稍后再读", { exact: true }).first().click();
  await expect(
    page.getByRole("link", { name: "E2E Public", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByText("稍后再读", { exact: true }).first().click();
  await expect(
    page.getByRole("link", { name: "E2E Public", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清空记录", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "清空记录", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "E2E Public", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("blog-reading-v1")!).items,
    ),
  ).toEqual([]);
});

test("client-side article and library navigation flushes the departing article's cached position", async ({
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
  const suffix = randomUUID();
  const b = "reading-transition-b-" + suffix,
    a = "reading-transition-a-" + suffix;
  const titleB = "E2E Transition B " + suffix;
  const createB = await request.post("/api/posts", {
    headers,
    data: {
      title: titleB,
      slug: b,
      content: "Short destination body.",
      published: true,
    },
  });
  expect(createB.ok()).toBe(true);
  const createA = await request.post("/api/posts", {
    headers: { ...headers, "Idempotency-Key": randomUUID() },
    data: {
      title: "E2E Transition A " + suffix,
      slug: a,
      content: Array.from(
        { length: 70 },
        (_, i) =>
          `## Chapter ${i}\n\n${"Long readable paragraph. ".repeat(25)}`,
      ).join("\n\n"),
      published: true,
    },
  });
  expect(createA.ok()).toBe(true);
  const idA = (await createA.json()).data.id;
  try {
    await page.goto("/posts/" + a);
    await expect(
      page.getByRole("button", { name: "稍后再读", exact: true }),
    ).toBeVisible();
    const capture = async () =>
      page.evaluate(
        ({ id }) => {
          const article = document.getElementById("article")!;
          window.scrollTo({ top: 400, behavior: "instant" });
          window.dispatchEvent(new Event("scroll"));
          window.scrollTo({ top: 1900, behavior: "instant" });
          window.dispatchEvent(new Event("scroll"));
          const top = article.getBoundingClientRect().top + scrollY;
          const ratio = Math.min(
            1,
            Math.max(
              0,
              (scrollY - top) / Math.max(article.offsetHeight - innerHeight, 1),
            ),
          );
          const old = JSON.parse(
            localStorage.getItem("blog-reading-v1")!,
          ).items.find((r: { id: number }) => r.id === id).ratio;
          return { ratio, old };
        },
        { id: idA },
      );
    const position = await capture();
    expect(position.ratio - position.old).toBeGreaterThan(0.05);
    await page
      .getByRole("link", { name: titleB, exact: true })
      .evaluate((link: HTMLAnchorElement) => link.click());
    await expect(page).toHaveURL("/posts/" + b);
    await expect
      .poll(() =>
        page.evaluate(
          (id) =>
            JSON.parse(localStorage.getItem("blog-reading-v1")!).items.find(
              (r: { id: number }) => r.id === id,
            ).ratio,
          idA,
        ),
      )
      .toBeCloseTo(position.ratio, 3);
    await page.goBack();
    await expect(page).toHaveURL("/posts/" + a);
    await expect(
      page.getByRole("button", { name: /继续上次阅读/ }),
    ).toBeVisible();
    const last = await capture();
    await page
      .getByRole("link", { name: "我的阅读", exact: true })
      .first()
      .evaluate((link: HTMLAnchorElement) => link.click());
    await expect(page).toHaveURL("/reading");
    await expect
      .poll(() =>
        page.evaluate(
          (id) =>
            JSON.parse(localStorage.getItem("blog-reading-v1")!).items.find(
              (r: { id: number }) => r.id === id,
            ).ratio,
          idA,
        ),
      )
      .toBeCloseTo(last.ratio, 3);
  } finally {
    await request.delete("/api/posts/" + a, { headers });
    await request.delete("/api/posts/" + b, { headers });
  }
});

test("recent reading displays thirty records while keeping fifty saved entries", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "blog-reading-v1",
      JSON.stringify({
        version: 1,
        items: Array.from({ length: 80 }, (_, i) => ({
          kind: "post",
          id: i + 1,
          saved: i < 50,
          visitedAt: Date.now() - (i < 50 ? 2000 + i : i),
          ratio: 0,
          heading: "",
        })),
      }),
    ),
  );
  await page.route("**/api/reading-library", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: route
          .request()
          .postDataJSON()
          .items.map((r: { id: number }) => ({
            ...r,
            title: "Reading entry " + r.id,
            slug: "entry-" + r.id,
            excerpt: "",
          })),
      }),
    }),
  );
  await page.goto("/reading");
  await expect(page.locator(".reading-library li")).toHaveCount(30);
  await expect(
    page.locator(".reading-library").getByRole("link").first(),
  ).toHaveText("Reading entry 51");
  await page.getByText("稍后再读", { exact: true }).first().click();
  await expect(page.locator(".reading-library li")).toHaveCount(50);
});
test("denied browser storage keeps content readable and does not claim a saved item", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "setItem", {
      value() {
        throw new DOMException("denied", "QuotaExceededError");
      },
    });
  });
  await page.goto("/posts/e2e-public");
  await expect(page.locator(".article-content")).toContainText(
    "Readable server body",
  );
  await page.getByRole("button", { name: "稍后再读", exact: true }).click();
  await expect(
    page.getByText("浏览器存储不可用，未保存。", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "稍后再读", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});
