import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("Qiniu variants select small covers, lazy body images and fall back once to originals", async ({
  page,
  request,
  browser,
}) => {
  const auth = await (
    await request.post("/api/login", {
      data: { username: "test-admin", password: "test-only" },
    })
  ).json();
  const headers = {
    Authorization: "Bearer " + auth.data.token,
    "Idempotency-Key": randomUUID(),
  };
  const key = randomUUID();
  const source = `https://image.xylxf.xyz/e2e-${key}.png`;
  const bad = `https://image.xylxf.xyz/e2e-fallback-${key}.png`;
  const result = await request.post("/api/posts", {
    headers,
    data: {
      title: "Image acceptance " + key,
      slug: "images-" + key,
      published: true,
      cover: source,
      content: `正文图片\n\n![cdn safe](${source})\n\n![fallback](${bad})`,
    },
  });
  expect(result.status()).toBe(200);
  const image = await (await request.get("/imgs/head-img.jpg")).body();
  let failedProcessed = 0,
    originals = 0;
  await page.route("https://image.xylxf.xyz/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("fallback") && url.search) {
      failedProcessed++;
      return route.fulfill({ status: 503 });
    }
    if (url.pathname.includes("fallback")) originals++;
    return route.fulfill({
      status: 200,
      contentType: "image/jpeg",
      body: image,
    });
  });
  try {
    await page.goto(
      "/allBlogs?q=" + encodeURIComponent("Image acceptance " + key),
    );
    const cover = page.locator(".editorial-feature-cover img");
    await expect(cover).toHaveAttribute("srcset", /imageView2.*480w/);
    expect(
      await cover.evaluate((element: HTMLImageElement) => element.currentSrc),
    ).toContain("imageView2");
    await page.goto("/posts/images-" + key);
    const safe = page.locator('.article-content img[alt="cdn safe"]');
    await expect(safe).toHaveAttribute("loading", "lazy");
    await expect(safe).toHaveAttribute("srcset", /768w/);
    const fallback = page.locator('.article-content img[alt="fallback"]');
    await fallback.scrollIntoViewIfNeeded();
    await expect(fallback).toHaveAttribute("src", bad);
    await expect(fallback).not.toHaveAttribute("srcset", /.+/);
    await expect.poll(() => originals).toBe(1);
    expect(failedProcessed).toBe(1);
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    try {
      await noJs.route("https://image.xylxf.xyz/**", (route) =>
        route.fulfill({ status: 200, contentType: "image/jpeg", body: image }),
      );
      const serverPage = await noJs.newPage();
      await serverPage.goto("/posts/images-" + key);
      await expect(
        serverPage.locator('.article-content img[alt="cdn safe"]'),
      ).toHaveAttribute("srcset", /imageView2/);
      await expect(serverPage.locator(".article-content")).toContainText(
        "正文图片",
      );
    } finally {
      await noJs.close();
    }
    const retired = await request.post("/api/upload", { headers });
    expect(retired.status()).toBe(410);
    expect((await retired.json()).code).toBe("LOCAL_UPLOAD_RETIRED");
  } finally {
    await request.delete("/api/posts/images-" + key, { headers });
  }
});
