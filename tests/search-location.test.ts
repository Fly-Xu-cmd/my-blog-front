import { expect, it } from "vitest";
import { characterOffset, searchSnippet } from "@/lib/markdown";
import { literalMatches } from "@/lib/text-match";
it("case-insensitive highlights retain original spans across Unicode case expansion and literal punctuation", () => {
  expect(literalMatches("İabc ABC", "a")).toEqual([
    { start: 1, end: 2 },
    { start: 5, end: 6 },
  ]);
  expect(literalMatches("🌌 İ目标[字]", "[字]")).toEqual([
    { start: 6, end: 9 },
  ]);
  expect(literalMatches("abab", "ab", 1)).toEqual([{ start: 0, end: 2 }]);
});
it("search snippets use the matched paragraph and preserve plain readable words", () => {
  const source =
    "## Intro\n\nFirst paragraph.\n\nHere is **Next.js** and a [link](https://example.com).\n\nLast paragraph.";
  const at = source.indexOf("Next.js");
  expect(searchSnippet(source, "Next.js", at)).toBe(
    "Here is Next.js and a link.",
  );
  expect(searchSnippet(source, "title-only", -1)).toBe("First paragraph.");
});
it("MySQL character offsets and Markdown UTF16 offsets agree after emoji and Chinese text", () => {
  const source = "🌌 星空\n\n目标段落";
  const raw = source.indexOf("目标");
  expect(characterOffset(source)(raw)).toBe([...source.slice(0, raw)].length);
  expect(searchSnippet(source, "目标", characterOffset(source)(raw))).toBe(
    "目标段落",
  );
});
