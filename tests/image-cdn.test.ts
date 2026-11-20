import { expect, it } from "vitest";
import { cdnImage, cdnSrcSet } from "@/lib/image-cdn";
import { legacyImagePaths } from "@/lib/image-reference-audit";

it("generates bounded Qiniu variants without modifying signed URLs, existing rules or unrelated images", () => {
  const source = "https://image.xylxf.xyz/example.png";
  expect(cdnImage(source, 320)).toBe(
    source + "?imageView2/2/w/320/q/80/format/webp",
  );
  expect(cdnImage(source, 10000)).toContain("/w/1920/");
  expect(cdnSrcSet(source, [160, 320])).toContain("320w");
  for (const original of [
    "/imgs/head-img.jpg",
    "https://elsewhere.test/image.png",
    source + "?e=42&token=signed",
    source + "?imageView2/2/w/50",
    "https://image.xylxf.xyz/animation.gif",
    "https://image.xylxf.xyz/vector.svg",
    source + "#fragment",
    source + "?",
    source + "#",
    "https://image.xylxf.xyz.evil.test/image.png",
  ]) {
    expect(cdnImage(original, 320)).toBe(original);
    expect(cdnSrcSet(original, [160, 320])).toBeUndefined();
  }
});

it("audits legacy relative/absolute Markdown and HTML references without exposing query credentials", () => {
  expect(
    legacyImagePaths(
      '![x](/uploads/a.png?token=private) <img src="https://old.test/upload/b.jpg"> [x](uploads/c.webp) /uploads/a.png',
    ),
  ).toEqual(["/upload/b.jpg", "/uploads/a.png", "/uploads/c.webp"]);
  expect(legacyImagePaths("![x](https://image.xylxf.xyz/a.png)")).toEqual([]);
});
