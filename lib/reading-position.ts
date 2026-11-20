export type ReadingPosition = {
  kind: "post" | "note";
  id: number;
  ratio: number;
  anchor: string;
  offset: number;
  version: string;
  visitedAt: number;
};
export const positionKey = "blog-reading-position-v2";
export const positionTtl = 30 * 86400000;
const initialNavigation =
  typeof window !== "undefined"
    ? (performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined)
    : undefined;
let historyNavigationAt =
  initialNavigation?.type === "back_forward" ? Date.now() : 0;
let historyNavigationPath =
  initialNavigation?.type === "back_forward" ? location.pathname : "";
export const markHistoryNavigation = () => {
  historyNavigationAt = Date.now();
  historyNavigationPath = location.pathname;
};
export const isHistoryNavigation = () => {
  const matches =
    Date.now() - historyNavigationAt < 1500 &&
    historyNavigationPath === location.pathname;
  historyNavigationAt = 0;
  return matches;
};
export function parsePositions(
  value: string | null,
  now = Date.now(),
): ReadingPosition[] {
  try {
    const data = JSON.parse(value ?? "null");
    if (data?.version !== 2 || !Array.isArray(data.items)) return [];
    const seen = new Set<string>();
    return data.items
      .slice(0, 30)
      .filter((r: ReadingPosition) => {
        const key = r?.kind + ":" + r?.id;
        if (
          !r ||
          !["post", "note"].includes(r.kind) ||
          !Number.isSafeInteger(r.id) ||
          r.id < 1 ||
          !Number.isFinite(r.ratio) ||
          r.ratio < 0 ||
          r.ratio > 1 ||
          !Number.isFinite(r.visitedAt) ||
          r.visitedAt > now + 60000 ||
          now - r.visitedAt > positionTtl ||
          !Number.isFinite(r.offset) ||
          r.offset < 0 ||
          r.offset > 100000 ||
          typeof r.anchor !== "string" ||
          !/^((heading|block)-\d+)?$/.test(r.anchor) ||
          typeof r.version !== "string" ||
          r.version.length > 64 ||
          seen.has(key)
        )
          return false;
        seen.add(key);
        return true;
      })
      .map(
        ({
          kind,
          id,
          ratio,
          anchor,
          offset,
          version,
          visitedAt,
        }: ReadingPosition) => ({
          kind,
          id,
          ratio,
          anchor,
          offset,
          version,
          visitedAt,
        }),
      );
  } catch {
    return [];
  }
}
export const readPositions = () =>
  parsePositions(localStorage.getItem(positionKey));
export function savePosition(row: ReadingPosition) {
  const rows = readPositions().filter(
    (r) => r.kind !== row.kind || r.id !== row.id,
  );
  localStorage.setItem(
    positionKey,
    JSON.stringify({
      version: 2,
      items: [row, ...rows]
        .sort((a, b) => b.visitedAt - a.visitedAt)
        .slice(0, 30),
    }),
  );
}
