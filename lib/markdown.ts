import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { literalMatches } from "./text-match";
type Node = {
  type: string;
  value?: string;
  children?: Node[];
  depth?: number;
  position?: { start: { offset?: number }; end?: { offset?: number } };
};
const plain = (node: Node): string =>
  node.value ?? node.children?.map(plain).join("") ?? "";
export function markdownHeadings(source: string) {
  const root = remark().use(remarkGfm).parse(source) as Node;
  const headings: { id: string; title: string; level: number }[] = [];
  const walk = (node: Node) => {
    if (node.type === "heading")
      headings.push({
        id: headingId(node.position?.start.offset),
        title: plain(node),
        level: node.depth ?? 1,
      });
    node.children?.forEach(walk);
  };
  walk(root);
  return headings;
}
export const headingId = (offset: number | undefined) =>
  "heading-" + (offset ?? 0);
// MySQL LOCATE uses Unicode character positions; Markdown uses UTF-16 offsets.
export function characterOffset(source: string) {
  const pairs = [...source.matchAll(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g)].map(
    (m) => m.index!,
  );
  return (offset = 0) => {
    let lo = 0,
      hi = pairs.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (pairs[mid] < offset) lo = mid + 1;
      else hi = mid;
    }
    return offset - lo;
  };
}
export function searchSnippet(source: string, query: string, matchAt: number) {
  const root = remark().use(remarkGfm).parse(source) as Node;
  const convert = characterOffset(source);
  const blocks: Node[] = [];
  const visit = (node: Node) => {
    if (["paragraph", "heading", "code", "table"].includes(node.type))
      blocks.push(node);
    else node.children?.forEach(visit);
  };
  visit(root);
  const selected =
    (matchAt >= 0
      ? blocks.find(
          (n) =>
            convert(n.position?.start.offset) <= matchAt &&
            convert(n.position?.end?.offset) > matchAt,
        )
      : undefined) ??
    blocks.find((n) => n.type === "paragraph") ??
    blocks[0];
  const text = selected ? plain(selected).replace(/\s+/g, " ").trim() : "";
  const at = literalMatches(text, query, 1)[0]?.start ?? -1;
  const start = at > 70 ? at - 70 : 0;
  const snippet = text.slice(start, start + 200);
  return (start ? "…" : "") + snippet + (start + 200 < text.length ? "…" : "");
}
export const safeJson = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");
export function shanghaiDate(value: Date | string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value))
    : "";
}
