import { afterEach, expect, it, vi } from "vitest";
import { reportRange } from "@/lib/report-range";
afterEach(() => vi.useRealTimers());
it("uses Shanghai calendar days for shortcuts across week and month boundaries", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-01T16:05:00Z"));
  const week = reportRange(new URLSearchParams("range=week"));
  expect([week.startDate, week.endDate, week.days]).toEqual([
    "2026-11-02",
    "2026-11-02",
    1,
  ]);
  expect(week.start.toISOString()).toBe("2026-11-01T16:00:00.000Z");
  expect(reportRange(new URLSearchParams("range=month")).dates).toEqual([
    "2026-11-01",
    "2026-11-02",
  ]);
  expect(reportRange(new URLSearchParams("range=7d")).days).toBe(7);
  expect(reportRange(new URLSearchParams(), "30d").days).toBe(30);
});
it("custom range includes both endpoints and leap day, with an exclusive UTC upper bound", () => {
  const result = reportRange(
    new URLSearchParams("start=2024-02-28&end=2024-03-01"),
  );
  expect(result.dates).toEqual(["2024-02-28", "2024-02-29", "2024-03-01"]);
  expect(result.start.toISOString()).toBe("2024-02-27T16:00:00.000Z");
  expect(result.end.toISOString()).toBe("2024-03-01T16:00:00.000Z");
});
it("rejects malformed, incomplete, reversed, future and excessive ranges", () => {
  for (const query of [
    "start=2025-02-29&end=2025-03-01",
    "start=2024-01-01",
    "start=2024-03-01&end=2024-02-01",
    "start=9999-01-01&end=9999-01-02",
    "start=2024-01-01&end=2025-01-01",
    "start=2024-01-01&end=2024-01-02&range=7d",
    "range=all",
    "start=x&end=x",
  ])
    expect(() => reportRange(new URLSearchParams(query))).toThrow();
  expect(
    reportRange(new URLSearchParams("start=2024-01-01&end=2024-12-31")).days,
  ).toBe(366);
});
