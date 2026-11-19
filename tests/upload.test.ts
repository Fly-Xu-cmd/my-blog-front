import { it, expect } from "vitest";
import { validateImage } from "@/lib/upload";
import jwt from "jsonwebtoken";
import { POST } from "@/app/api/upload/route";
it("retired local upload remains authenticated and never reads a submitted file", async () => {
  const req = new Request("http://localhost/api/upload", {
    method: "POST",
    headers: {
      Authorization:
        "Bearer " +
        jwt.sign({ username: "test-admin" }, process.env.JWT_SECRET!),
    },
  });
  const response = await POST(req);
  expect(response.status).toBe(410);
  expect((await response.json()).code).toBe("LOCAL_UPLOAD_RETIRED");
  expect(req.bodyUsed).toBe(false);
});
it("rejects SVG, forged MIME, wrong extension and oversized images", async () => {
  for (const file of [
    new File(["<svg/>"], "x.svg", { type: "image/svg+xml" }),
    new File(["<svg/>"], "x.png", { type: "image/png" }),
    new File(["GIF89a"], "x.jpg", { type: "image/gif" }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], "x.png", {
      type: "image/png",
    }),
  ])
    await expect(validateImage(file)).rejects.toMatchObject({ status: 400 });
  const png = new File(
    [Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])],
    "x.png",
    {
      type: "image/png",
    },
  );
  expect((await validateImage(png)).length).toBe(8);
});
