import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
let submittedMessage = "";
test("private feedback retries a lost response with the same key and cannot be read anonymously", async ({
  page,
  request,
}) => {
  const prose =
    "Private feedback " +
    randomUUID() +
    " <script>window.feedbackAttack=1</script>";
  submittedMessage = prose;
  await page.goto("/posts/e2e-public");
  await page.getByRole("button", { name: "纠错与反馈", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "纠错与反馈", exact: true });
  await modal.getByLabel("反馈内容", { exact: true }).fill(prose);
  await modal
    .getByLabel("联系邮箱（选填）", { exact: true })
    .fill("reader@example.com");
  let first = "",
    second = "";
  const lost = async (route: import("@playwright/test").Route) => {
    first = route.request().postDataJSON().submissionId;
    await route.fetch();
    await route.abort("failed");
  };
  await page.route("**/api/feedback", lost);
  await modal
    .getByRole("button", { name: "私下发送给作者", exact: true })
    .click();
  await expect(modal.getByRole("alert")).toBeVisible();
  await page.unroute("**/api/feedback", lost);
  page.on("request", (r) => {
    if (r.method() === "POST" && new URL(r.url()).pathname === "/api/feedback")
      second = r.postDataJSON().submissionId;
  });
  await modal
    .getByRole("button", { name: "私下发送给作者", exact: true })
    .click();
  await expect(modal).not.toBeVisible();
  expect(second).toBe(first);
  expect((await request.get("/api/feedback")).status()).toBe(401);
  expect(await page.evaluate(() => "feedbackAttack" in window)).toBe(false);
  const auth = (
    await (
      await request.post("/api/login", {
        data: { username: "test-admin", password: "test-only" },
      })
    ).json()
  ).data;
  const inbox = (
    await (
      await request.get("/api/feedback?pageSize=50", {
        headers: { Authorization: "Bearer " + auth.token },
      })
    ).json()
  ).data;
  expect(
    inbox.filter((r: { message: string }) => r.message === prose),
  ).toHaveLength(1);
  expect(await (await request.get("/posts/e2e-public")).text()).not.toContain(
    prose,
  );
});
test("article discussion uses the configured public link and sharing exports a readable PNG", async ({
  page,
}, testInfo) => {
  await page.goto("/posts/e2e-public");
  await expect(
    page.getByRole("link", { name: "GitHub 讨论 ↗", exact: true }),
  ).toHaveAttribute("href", /github\.com\/Fly-Xu-cmd\/my-blog-front\/issues/);
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "生成分享卡片", exact: true }).click();
  const download = await downloading;
  await download.saveAs(testInfo.outputPath("share-card.png"));
  expect(download.suggestedFilename()).toBe("blog-share.png");
  const buffer = await readFile((await download.path())!);
  expect(buffer.subarray(1, 4).toString()).toBe("PNG");
  expect(buffer.readUInt32BE(16)).toBe(1200);
  expect(buffer.readUInt32BE(20)).toBe(630);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("admin reads private feedback as plain text and marks it resolved", async ({
  page,
}) => {
  test.skip(!process.env.ADMIN_E2E_DIR, "Requires paired admin");
  await page.goto("http://127.0.0.1:8000/user/login");
  await page.getByLabel("用户名").fill("test-admin");
  await page.getByLabel("密码", { exact: true }).fill("test-only");
  await page.getByRole("button", { name: /登\s*入/ }).click();
  await expect(page).toHaveURL(/welcome/);
  await page.goto("http://127.0.0.1:8000/manage/feedback");
  expect(submittedMessage).not.toBe("");
  const row = page
    .getByRole("row")
    .filter({ hasText: submittedMessage })
    .first();
  await expect(row).toContainText("reader@example.com");
  expect(await page.evaluate(() => "feedbackAttack" in window)).toBe(false);
  await row.locator(".ant-select").click();
  await page
    .locator(".ant-select-item-option-content")
    .filter({ hasText: /^已处理$/ })
    .click();
  await expect(page.getByText("反馈状态已更新", { exact: true })).toBeVisible();
  await expect(row).not.toBeVisible();
  await page.route("**/api/feedback-settings?scope=admin", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "config unavailable" }),
    }),
  );
  await page.getByRole("button", { name: "重新载入", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "保存讨论入口", exact: true }),
  ).toBeDisabled();
});
