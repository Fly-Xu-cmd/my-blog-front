/** Literal Unicode matching returns UTF-16 spans in the original text. */
export function literalMatches(text: string, query: string, limit = 200) {
  if (!query) return [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const spans: { start: number; end: number }[] = [];
  for (const match of text.matchAll(new RegExp(escaped, "giu"))) {
    spans.push({ start: match.index, end: match.index + match[0].length });
    if (spans.length >= limit) break;
  }
  return spans;
}
