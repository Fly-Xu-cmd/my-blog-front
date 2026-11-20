export type ReadingRef = { kind: "post" | "note"; id: number };
export type ReadingRecord = ReadingRef & {
  saved: boolean;
  visitedAt: number;
  ratio: number;
  heading: string;
};
export const readingStorageKey = "blog-reading-v1";
export const readingEvent = "blog-reading-changed";
export const refKey = (ref: ReadingRef) => ref.kind + ":" + ref.id;
export function parseReading(value: string | null): ReadingRecord[] {
  try {
    const parsed = JSON.parse(value || "null");
    if (parsed?.version !== 1 || !Array.isArray(parsed.items)) return [];
    const seen = new Set<string>();
    return parsed.items
      .slice(0, 80)
      .filter((row: ReadingRecord) => {
        const valid =
          row &&
          ["post", "note"].includes(row.kind) &&
          Number.isSafeInteger(row.id) &&
          row.id > 0 &&
          typeof row.saved === "boolean" &&
          Number.isFinite(row.visitedAt) &&
          row.visitedAt >= 0 &&
          Number.isFinite(row.ratio) &&
          row.ratio >= 0 &&
          row.ratio <= 1 &&
          typeof row.heading === "string" &&
          row.heading.length <= 200;
        if (!valid || seen.has(refKey(row))) return false;
        seen.add(refKey(row));
        return true;
      })
      .map((row: ReadingRecord) => ({
        kind: row.kind,
        id: row.id,
        saved: row.saved,
        visitedAt: row.visitedAt,
        ratio: row.ratio,
        heading: row.heading,
      }));
  } catch {
    return [];
  }
}
export function readReadingState() {
  return parseReading(localStorage.getItem(readingStorageKey));
}
export function mutateReading(
  update: (items: ReadingRecord[]) => ReadingRecord[],
) {
  const rows = update(readReadingState()).sort(
    (a, b) => b.visitedAt - a.visitedAt,
  );
  const saved = rows.filter((r) => r.saved).slice(0, 50);
  const recent = rows.filter((r) => r.visitedAt > 0).slice(0, 30);
  const chosen = new Set([...saved, ...recent].map(refKey));
  const items = rows
    .filter((r) => chosen.has(refKey(r)))
    .map((r) => ({ ...r, saved: saved.some((s) => refKey(s) === refKey(r)) }));
  localStorage.setItem(
    readingStorageKey,
    JSON.stringify({ version: 1, items }),
  );
  window.dispatchEvent(new Event(readingEvent));
  return items;
}
export function updateReading(
  ref: ReadingRef,
  patch: Partial<Omit<ReadingRecord, "kind" | "id">>,
) {
  return mutateReading((items) => {
    const previous = items.find((r) => refKey(r) === refKey(ref));
    return [
      {
        ...ref,
        saved: false,
        visitedAt: 0,
        ratio: 0,
        heading: "",
        ...previous,
        ...patch,
      },
      ...items.filter((r) => refKey(r) !== refKey(ref)),
    ];
  });
}
