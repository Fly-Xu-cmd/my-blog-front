import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  parseReading,
  updateReading,
  readReadingState,
  mutateReading,
  readingStorageKey,
} from "@/lib/reading-state";
let stored: string | null = null;
beforeEach(() => {
  stored = null;
  vi.stubGlobal("localStorage", {
    getItem: () => stored,
    setItem: (_key: string, value: string) => {
      stored = value;
    },
  });
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());
it("corrupt data and unsafe references are ignored without accepting arbitrary fields", () => {
  expect(parseReading("broken")).toEqual([]);
  expect(parseReading('{"version":2,"items":[]}')).toEqual([]);
  const row = {
    kind: "post",
    id: 1,
    saved: true,
    visitedAt: 1,
    ratio: 0.5,
    heading: "标题",
    token: "never keep",
  };
  expect(
    parseReading(
      JSON.stringify({
        version: 1,
        items: [row, row, { ...row, id: -1 }, { ...row, id: 2, ratio: 3 }],
      }),
    ),
  ).toEqual([
    {
      kind: "post",
      id: 1,
      saved: true,
      visitedAt: 1,
      ratio: 0.5,
      heading: "标题",
    },
  ]);
});
it("mutations merge the latest browser state, preserve saves and cap storage", () => {
  updateReading({ kind: "post", id: 1 }, { saved: true, visitedAt: 1 });
  updateReading(
    { kind: "post", id: 1 },
    { ratio: 0.4, heading: "a", visitedAt: 2 },
  );
  expect(readReadingState()[0]).toMatchObject({
    saved: true,
    ratio: 0.4,
    heading: "a",
  });
  for (let id = 2; id < 100; id++)
    updateReading({ kind: "post", id }, { saved: id <= 60, visitedAt: id });
  const rows = readReadingState();
  expect(rows.length).toBeLessThanOrEqual(80);
  expect(rows.filter((r) => r.saved)).toHaveLength(50);
  expect(rows[0].id).toBe(99);
  mutateReading(() => []);
  expect(readReadingState()).toEqual([]);
  expect(readingStorageKey).toBe("blog-reading-v1");
});
it("storage denial is explicit instead of reporting a successful save", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {
      throw new Error("quota");
    },
  });
  expect(() => updateReading({ kind: "post", id: 1 }, { saved: true })).toThrow(
    "quota",
  );
});
