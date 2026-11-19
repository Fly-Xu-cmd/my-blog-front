import { createServer, type Socket } from "node:net";
import { spawn } from "node:child_process";
import { expect, test } from "vitest";

test("audit CLI exits nonzero on a stalled TCP handshake without printing credentials or success", async () => {
  const sockets = new Set<Socket>();
  const server = createServer({ allowHalfOpen: true }, (socket) => {
    sockets.add(socket);
    socket.on("error", () => {}); // The watchdog may reset an unfinished handshake.
    socket.write(Buffer.from([0x4a, 0x00])); // Partial MySQL packet; then never respond or close.
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  try {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "scripts/audit-image-references.ts"],
      {
        env: {
          ...process.env,
          AUDIT_DATABASE_URL: `mysql://audit:never-print-this@127.0.0.1:${port}/unused`,
          AUDIT_TIMEOUT_MS: "1000",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.on("data", (part) => {
      output += part;
    });
    child.stderr.on("data", (part) => {
      output += part;
    });
    const killed = setTimeout(() => child.kill(), 6000);
    const result = await new Promise<{
      code: number | null;
      signal: string | null;
    }>((resolve, reject) => {
      child.on("error", reject);
      child.on("exit", (code, signal) => resolve({ code, signal }));
    }).finally(() => clearTimeout(killed));
    expect(result).toEqual({ code: 1, signal: null });
    expect(output).toContain("exceeded its deadline");
    expect(output).not.toContain("never-print-this");
    expect(output).not.toContain('"complete":true');
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}, 10000);
