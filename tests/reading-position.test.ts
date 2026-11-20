import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  parsePositions,
  readPositions,
  savePosition,
  positionKey,
  positionTtl,
  markHistoryNavigation,
  isHistoryNavigation,
} from "@/lib/reading-position";
let stored: string | null = null;
beforeEach(() => {
  stored = null;
  vi.stubGlobal("localStorage", {
    getItem: () => stored,
    setItem: (_k: string, value: string) => {
      stored = value;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
it("consumes a history marker once and never applies it to a different article", () => {
  vi.stubGlobal("location", { pathname: "/posts/a" });
  markHistoryNavigation();
  expect(isHistoryNavigation()).toBe(true);
  expect(isHistoryNavigation()).toBe(false);
  markHistoryNavigation();
  vi.stubGlobal("location", { pathname: "/posts/b" });
  expect(isHistoryNavigation()).toBe(false);
  vi.stubGlobal("location", { pathname: "/posts/a" });
  expect(isHistoryNavigation()).toBe(false);
});
const row = (id = 1) => ({
  kind: "post" as const,
  id,
  ratio: 0.5,
  anchor: "block-100",
  offset: 20,
  version: "abc",
  visitedAt: Date.now(),
});
it("expires old positions and ignores unsafe, duplicate or unknown fields", () => {
  const valid = row();
  const parsed = parsePositions(
    JSON.stringify({
      version: 2,
      items: [
        { ...valid, token: "secret" },
        valid,
        { ...row(2), visitedAt: Date.now() - positionTtl - 1 },
        { ...row(3), anchor: "script" },
        { ...row(4), ratio: 2 },
      ],
    }),
  );
  expect(parsed).toEqual([valid]);
  expect(parsePositions("broken")).toEqual([]);
  expect(parsePositions('{"version":1,"items":[]}')).toEqual([]);
});
it("keeps at most thirty recent positions, never titles, content or saved lists", () => {
  for (let id = 1; id <= 40; id++)
    savePosition({ ...row(id), visitedAt: Date.now() - 40 + id });
  expect(readPositions()).toHaveLength(30);
  expect(readPositions()[0].id).toBe(40);
  expect(positionKey).toBe("blog-reading-position-v2");
  expect(readPositions()[0]).not.toHaveProperty("saved");
  expect(readPositions()[0]).not.toHaveProperty("title");
});
it("storage failure remains an optional failure rather than inventing an identity", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {
      throw new Error("quota");
    },
  });
  expect(() => savePosition(row())).toThrow("quota");
});
