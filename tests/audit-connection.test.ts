import { afterEach, expect, test, vi } from "vitest";
import { withAuditConnection } from "@/lib/audit-connection";
afterEach(() => vi.useRealTimers());
test.each(["initialize", "shutdown"])(
  "audit exits and destroys its connection when %s hangs",
  async (phase) => {
    vi.useFakeTimers();
    const hanging = new Promise<void>(() => {});
    const connection = {
      destroy: vi.fn(),
      end: vi.fn(() => (phase === "shutdown" ? hanging : Promise.resolve())),
    };
    const result = withAuditConnection(
      async () => connection,
      async () => (phase === "initialize" ? hanging : undefined),
      100,
    );
    const failed = expect(result).rejects.toThrow("Audit time limit");
    await vi.advanceTimersByTimeAsync(101);
    await failed;
    expect(connection.destroy).toHaveBeenCalled();
  },
);
test("a late connection is destroyed without starting the snapshot or returning success", async () => {
  vi.useFakeTimers();
  let complete!: (connection: {
    destroy(): void;
    end(): Promise<void>;
  }) => void;
  const connect = new Promise<{ destroy(): void; end(): Promise<void> }>(
    (resolve) => {
      complete = resolve;
    },
  );
  const read = vi.fn();
  const result = withAuditConnection(() => connect, read, 100);
  const failed = expect(result).rejects.toThrow("Audit time limit");
  await vi.advanceTimersByTimeAsync(101);
  await failed;
  const connection = { destroy: vi.fn(), end: vi.fn(async () => {}) };
  complete(connection);
  await Promise.resolve();
  await Promise.resolve();
  expect(connection.destroy).toHaveBeenCalledOnce();
  expect(read).not.toHaveBeenCalled();
});
