import { test, expect } from "@playwright/test";

test("subscription controls and theme icon retain their theme before hydration", async ({ browser, baseURL }) => {
  for (const scenario of [
    { stored: "dark", system: "light", dark: true, icon: "dark" },
    { stored: "light", system: "dark", dark: false, icon: "light" },
    { stored: "system", system: "dark", dark: true, icon: "system" },
  ] as const) {
    const context = await browser.newContext({ colorScheme: scenario.system });
    await context.addInitScript(({ stored }) => {
      localStorage.setItem("theme", stored);
      const samples: boolean[] = [];
      (window as unknown as { themeSamples: boolean[] }).themeSamples = samples;
      new MutationObserver(records => {
        if (records.some(r => r.target === document.documentElement)) {
          samples.push(document.documentElement.classList.contains("dark"));
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["class"] });
    }, scenario);
    let blockHydration = true;
    await context.route("**/_next/static/**/*.js", route => blockHydration ? route.abort() : route.continue());
    const page = await context.newPage();
    await page.goto(baseURL + "/subscribe");
    const input = page.getByRole("textbox", { name: "RSS 订阅地址" });
    await expect(input).toHaveCSS("background-color", scenario.dark ? "rgb(20, 20, 20)" : "rgb(255, 255, 255)");
    await expect(page.getByRole("button", { name: "复制地址", exact: true })).toBeDisabled();
    await expect(page.locator(".theme-icon-" + scenario.icon)).toBeVisible();
    const sample = async () => page.evaluate(() => {
      const input = getComputedStyle(document.querySelector(".subscription-address-row input")!);
      const primary = getComputedStyle(document.querySelector(".subscription-address-row button")!);
      return {
        background: input.backgroundColor, text: input.color,
        primaryBackground: primary.backgroundColor, primaryText: primary.color,
        reader: getComputedStyle(document.querySelector(".subscription-reader-row .ant-btn")!).color,
        guide: getComputedStyle(document.querySelector(".subscription-guide .ant-collapse-header")!).color,
        icon: getComputedStyle(document.querySelector(".theme-toggle")!).color,
      };
    });
    const before = await sample();
    blockHydration = false;
    await page.reload();
    await expect(page.getByRole("button", { name: "复制地址", exact: true })).toBeEnabled();
    await expect(page.locator(".theme-icon-" + scenario.icon)).toBeVisible();
    expect(await sample()).toEqual(before);
    expect(await page.evaluate(() => (window as unknown as { themeSamples: boolean[] }).themeSamples.every(
      dark => dark === document.documentElement.classList.contains("dark"),
    ))).toBe(true);
    expect(await page.locator("html").evaluate(el => el.classList.contains("dark"))).toBe(scenario.dark);
    await context.close();
  }
});

test("subscription navigation, preview and copy retain a human-facing blog page", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(
    `Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedSubscription = text; } } });`,
  );
  await page.goto("/");
  await page.getByRole("link", { name: "RSS 订阅 ↗", exact: true }).click();
  await expect(page).toHaveURL(/\/subscribe$/);
  await expect(
    page.getByRole("heading", { name: "订阅，慢慢读。", exact: true }),
  ).toBeVisible();
  await expect(page.locator("header nav a[aria-current=page]")).toHaveText(
    "订阅",
  );
  const address = await page
    .getByRole("textbox", { name: "RSS 订阅地址" })
    .inputValue();
  expect(new URL(address).pathname).toBe("/feed.xml");
  await page.getByRole("button", { name: "复制地址", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "已复制", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate("window.copiedSubscription")).toBe(address);
  const feedly = await page
    .getByRole("link", { name: /用 Feedly 订阅/ })
    .getAttribute("href");
  const inoreader = await page
    .getByRole("link", { name: /用 Inoreader 订阅/ })
    .getAttribute("href");
  expect(feedly).toBe(
    "https://feedly.com/i/subscription/feed/" + encodeURIComponent(address),
  );
  expect(new URL(inoreader!).searchParams.get("add_feed")).toBe(address);
  const raw = page.getByRole("link", { name: /原始 RSS/ });
  await expect(raw).toHaveAttribute("href", "/feed.xml");
  await expect(raw).toHaveAttribute("target", "_blank");
  await page.getByText("第一次用 RSS？这样开始", { exact: true }).click();
  await expect(page.getByText("选一个阅读器。", { exact: true })).toBeVisible();
  const titles = await page
    .locator(".subscription-entries h3")
    .allTextContents();
  expect(titles.length).toBeGreaterThan(0);
  expect(titles.length).toBeLessThanOrEqual(5);
  const feed = await request.get("/feed.xml");
  expect(feed.status()).toBe(200);
  expect(feed.headers()["content-type"]).toContain("application/rss+xml");
  const xml = await feed.text();
  const feedTitles = await page.evaluate((xml) => {
    const document = new DOMParser().parseFromString(xml, "application/xml");
    if (document.querySelector("parsererror")) throw new Error("Invalid feed XML");
    return Array.from(document.querySelectorAll("item > title")).map(node => node.textContent);
  }, xml);
  expect(feedTitles.slice(0, titles.length)).toEqual(titles);
  expect(
    await page
      .locator('head link[rel=alternate][type="application/rss+xml"]')
      .evaluate((el) => (el as HTMLLinkElement).href),
  ).toBe(address);
  await page.locator(".subscription-entries h3 a").first().click();
  await expect(page).toHaveURL(/\/(posts|notes)\//);
});

test("subscription addresses and reader links follow the current origin", async ({ page, baseURL }) => {
  await page.addInitScript(
    `Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedSubscription = text; } } });`,
  );
  const alternate = new URL(baseURL!);
  alternate.hostname = "localhost";
  for (const origin of [new URL(baseURL!).origin, alternate.origin]) {
    await page.goto(origin + "/subscribe");
    const expected = origin + "/feed.xml";
    await expect(page.getByRole("textbox", { name: "RSS 订阅地址" })).toHaveValue(expected);
    await expect(page.getByRole("link", { name: /用 Feedly 订阅/ })).toHaveAttribute(
      "href", "https://feedly.com/i/subscription/feed/" + encodeURIComponent(expected),
    );
    await expect(page.getByRole("link", { name: /用 Inoreader 订阅/ })).toHaveAttribute(
      "href", "https://www.inoreader.com/?add_feed=" + encodeURIComponent(expected),
    );
    expect(await page.locator('head link[rel=alternate][type="application/rss+xml"]').evaluate(
      el => (el as HTMLLinkElement).href,
    )).toBe(expected);
    await page.getByRole("button", { name: "复制地址", exact: true }).click();
    await expect(page.getByRole("button", { name: "已复制", exact: true })).toBeVisible();
    expect(await page.evaluate("window.copiedSubscription")).toBe(expected);
  }
});

test("clipboard failure offers manual selection and the mobile subscription entry works", async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    `Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('permission denied'); } } });`,
  );
  await page.goto("/");
  await page.getByRole("button", { name: "网站导航" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "订阅", exact: true }).click();
  await expect(page).toHaveURL(/\/subscribe$/);
  await page.getByRole("button", { name: "复制地址", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("手动复制");
  expect(
    await page.getByRole("textbox", { name: "RSS 订阅地址" }).evaluate((el) => {
      const input = el as HTMLInputElement;
      return (
        input.selectionStart === 0 && input.selectionEnd === input.value.length
      );
    }),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.locator(".subscription-entries h3 a").first().evaluate((el) => {
    el.textContent = "LongUnbrokenTitle".repeat(15);
  });
  await page.setViewportSize({ width: 320, height: 844 });
  const titleBounds = await page.locator(".subscription-entries h3 a").first().evaluate((el) => {
    const title = el.getBoundingClientRect();
    const column = el.closest(".subscription-entry-copy")!.getBoundingClientRect();
    return { right: title.right, columnRight: column.right, scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth };
  });
  expect(titleBounds.right).toBeLessThanOrEqual(titleBounds.columnRight + 1);
  expect(titleBounds.scrollWidth).toBeLessThanOrEqual(titleBounds.viewport);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto("http://127.0.0.1:3197/subscribe");
  await expect(
    staticPage.getByRole("heading", { name: "订阅，慢慢读。" }),
  ).toBeVisible();
  await expect(
    staticPage.getByRole("textbox", { name: "RSS 订阅地址" }),
  ).toHaveValue(/\/feed\.xml$/);
  await expect(
    staticPage.getByRole("button", { name: "复制地址" }),
  ).toBeDisabled();
  await expect(
    staticPage.locator(".subscription-entries li").first(),
  ).toBeVisible();
  await context.close();
});
