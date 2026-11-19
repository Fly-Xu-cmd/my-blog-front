import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test.skip(!process.env.ADMIN_E2E_DIR, "Requires paired isolated admin build");
test("browser recovery replays a lost creation response with the same key and history restoration requires manual save", async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  const title = "Draft " + randomUUID();
  const auth = await (
    await request.post("/api/login", {
      data: { username: "test-admin", password: "test-only" },
    })
  ).json();
  const headers = { Authorization: "Bearer " + auth.data.token };
  let slug = "",
    firstKey = "",
    retryKey = "";
  try {
    await page.goto("http://127.0.0.1:8000/user/login");
    await page.getByLabel("用户名").fill("test-admin");
    await page.getByLabel("密码", { exact: true }).fill("test-only");
    await page.getByRole("button", { name: /登\s*入/ }).click();
    await expect(page).toHaveURL(/welcome/);
    await page.goto("http://127.0.0.1:8000/new/post");
    await page.getByPlaceholder("请输入标题...").fill(title);
    await page.locator(".w-md-editor-text-input").fill("First local body");
    await expect(
      page.getByText("本浏览器草稿已保存", { exact: false }),
    ).toBeVisible();
    const lost = async (route: import("@playwright/test").Route) => {
      if (route.request().method() !== "POST") return route.continue();
      firstKey = route.request().headers()["idempotency-key"];
      const response = await route.fetch();
      const data = await response.json();
      slug = data.data.slug;
      await route.abort("failed");
    };
    await page.route("**/api/posts", lost);
    await page.getByRole("button", { name: "保存草稿" }).click();
    await expect.poll(() => slug).not.toBe("");
    await expect(page.getByRole("button", { name: "保存草稿" })).toBeEnabled();
    await page.unroute("**/api/posts", lost);
    page.on("dialog", (dialog) => dialog.accept());
    await page.reload();
    await page.getByRole("button", { name: "恢复草稿" }).click();
    await expect(page.getByPlaceholder("请输入标题...")).toHaveValue(title);
    await expect(page.locator(".w-md-editor-text-input")).toHaveValue(
      "First local body",
    );
    page.on("request", (r) => {
      if (r.method() === "POST" && new URL(r.url()).pathname === "/api/posts")
        retryKey = r.headers()["idempotency-key"];
    });
    await page.getByRole("button", { name: "保存草稿" }).click();
    await expect(page.getByText("草稿已保存", { exact: true })).toBeVisible();
    expect(retryKey).toBe(firstKey);
    const list = await (
      await request.get(
        "/api/posts?scope=admin&q=" + encodeURIComponent(title),
        { headers },
      )
    ).json();
    expect(list.total).toBe(1);
    await page.goto("http://127.0.0.1:8000/manage/post");
    const row = page.getByRole("row").filter({ hasText: title });
    await row.getByText("编辑", { exact: true }).click();
    const editor = page.locator(".ant-drawer-content").first();
    await editor.locator(".w-md-editor-text-input").fill("Second body");
    await editor.getByRole("button", { name: /保\s*存/ }).click();
    await expect(editor).not.toBeVisible();
    await row.getByText("编辑", { exact: true }).click();
    await editor.getByRole("button", { name: "历史版本" }).click();
    const history = page.locator(".ant-drawer-content").last();
    await history
      .getByRole("button", { name: "预览版本 1", exact: true })
      .click();
    await expect(history).toContainText("First local body");
    await history.getByRole("button", { name: "载入编辑器" }).click();
    await expect(editor.locator(".w-md-editor-text-input")).toHaveValue(
      "First local body",
    );
    expect(
      (
        await (
          await request.get("/api/posts/" + slug + "?scope=admin", { headers })
        ).json()
      ).data.content,
    ).toBe("Second body");
    await editor.getByRole("button", { name: /保\s*存/ }).click();
    await expect(editor).not.toBeVisible();
    const restored = (
      await (
        await request.get("/api/posts/" + slug + "?scope=admin", { headers })
      ).json()
    ).data;
    expect(restored.content).toBe("First local body");
    expect(restored.published).toBe(false);
    expect(restored.slug).toBe(slug);
  } finally {
    if (slug) await request.delete("/api/posts/" + slug, { headers });
  }
});

for (const first of ["cover", "body"] as const) {
  test(`parallel cover/body uploads keep save and close guarded until both finish (${first} first)`, async ({
    page,
    request,
  }) => {
    test.setTimeout(60000);
    const title = "Uploads " + randomUUID();
    const auth = await (
      await request.post("/api/login", {
        data: { username: "test-admin", password: "test-only" },
      })
    ).json();
    const headers = {
      Authorization: "Bearer " + auth.data.token,
      "Idempotency-Key": randomUUID(),
    };
    const created = (
      await (
        await request.post("/api/posts", {
          headers,
          data: { title, content: "Existing body" },
        })
      ).json()
    ).data;
    const pending: Partial<
      Record<
        "cover" | "body",
        { route: import("@playwright/test").Route; resolve: () => void }
      >
    > = {};
    const base = "http://127.0.0.1:3197/imgs/head-img.jpg?kind=";
    await page.route(
      "**/api/upload-qiniu",
      (route) =>
        new Promise<void>((resolve) => {
          const kind = route
            .request()
            .postDataBuffer()
            ?.toString()
            .includes("cover.png")
            ? "cover"
            : "body";
          pending[kind] = { route, resolve };
        }),
    );
    try {
      await page.goto("http://127.0.0.1:8000/user/login");
      await page.getByLabel("用户名").fill("test-admin");
      await page.getByLabel("密码", { exact: true }).fill("test-only");
      await page.getByRole("button", { name: /登\s*入/ }).click();
      await expect(page).toHaveURL(/welcome/);
      await page.goto("http://127.0.0.1:8000/manage/post");
      await page
        .getByRole("row")
        .filter({ hasText: title })
        .getByText("编辑", { exact: true })
        .click();
      const drawer = page.locator(".ant-drawer-content").first();
      const coverChooser = page.waitForEvent("filechooser");
      await drawer.getByRole("button", { name: "上传封面" }).click();
      await (
        await coverChooser
      ).setFiles({
        name: "cover.png",
        mimeType: "image/png",
        buffer: Buffer.from("mock cover"),
      });
      await expect.poll(() => !!pending.cover).toBe(true);
      const bodyChooser = page.waitForEvent("filechooser");
      await drawer
        .getByRole("button", { name: "upload image", exact: true })
        .click();
      await (
        await bodyChooser
      ).setFiles({
        name: "body.png",
        mimeType: "image/png",
        buffer: Buffer.from("mock body"),
      });
      await expect.poll(() => !!pending.body).toBe(true);
      const release = async (kind: "cover" | "body") => {
        const held = pending[kind]!;
        await held.route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ url: base + kind }),
        });
        held.resolve();
        delete pending[kind];
      };
      await release(first);
      if (first === "cover")
        await expect(drawer.getByLabel("封面 URL")).toHaveValue(base + first);
      else
        await expect(drawer.locator(".w-md-editor-text-input")).toHaveValue(
          /kind=body/,
        );
      await expect(
        drawer.getByRole("button", { name: /保\s*存/ }),
      ).toBeDisabled();
      await drawer.getByRole("button", { name: "关闭", exact: true }).click();
      await expect(drawer).toBeVisible();
      await release(first === "cover" ? "body" : "cover");
      await expect(
        drawer.getByRole("button", { name: /保\s*存/ }),
      ).toBeEnabled();
      await drawer.getByRole("button", { name: /保\s*存/ }).click();
      await expect(drawer).not.toBeVisible();
      const result = (
        await (
          await request.get("/api/posts/" + created.slug + "?scope=admin", {
            headers,
          })
        ).json()
      ).data;
      expect(result.cover).toBe(base + "cover");
      expect(result.content).toContain(base + "body");
    } finally {
      for (const held of Object.values(pending)) {
        await held?.route.abort().catch(() => {});
        held?.resolve();
      }
      await request
        .delete("/api/posts/" + created.slug, { headers })
        .catch(() => {});
    }
  });
}
