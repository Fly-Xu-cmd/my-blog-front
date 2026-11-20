import "dotenv/config";
import mysql from "mysql2/promise";
import { writeFile } from "node:fs/promises";
import { legacyImagePaths } from "../lib/image-reference-audit";
import { withAuditConnection } from "../lib/audit-connection";

const explicit = process.env.AUDIT_DATABASE_URL;
if (!explicit && !process.argv.includes("--configured"))
  throw new Error("Specify AUDIT_DATABASE_URL or --configured");
const url = explicit ?? process.env.DATABASE_URL;
if (!url) throw new Error("Database URL is not configured");
const timeout = Number(process.env.AUDIT_TIMEOUT_MS ?? 180000);
if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 180000)
  throw new Error("AUDIT_TIMEOUT_MS must be between 1000 and 180000");
// The CLI must also exit if a driver socket is stuck during handshake or half-close.
// This watchdog starts before opening a connection and terminates only this audit process.
const watchdog = setTimeout(() => {
  console.error(
    "Image reference audit exceeded its deadline; no success report was produced.",
  );
  process.exit(1);
}, timeout);

async function main() {
  const references: {
    resource: string;
    id: number;
    field: string;
    paths: string[];
  }[] = [];
  const scanned: Record<string, number> = {};
  await withAuditConnection(
    () => mysql.createConnection(url!),
    async (connection) => {
      // One connection enforces a read-only snapshot, including hidden content.
      await connection.query({
        sql: "SET SESSION TRANSACTION READ ONLY",
        timeout: 5000,
      });
      await connection.query({
        sql: "START TRANSACTION WITH CONSISTENT SNAPSHOT",
        timeout: 5000,
      });
      const start = Date.now();
      for (const [table, fields] of [
        ["Post", ["cover", "content", "excerpt"]],
        ["Note", ["content", "excerpt"]],
        ["Dynamic", ["content", "excerpt"]],
        ["AboutPage", ["content"]],
      ] as const) {
        let lastId = 0;
        scanned[table] = 0;
        while (true) {
          if (Date.now() - start > 180000) throw new Error("Audit time limit");
          const [rows] = await connection.query<mysql.RowDataPacket[]>(
            {
              sql: `SELECT id,${fields.map((field) => "`" + field + "`").join(",")} FROM \`${table}\` WHERE id > ? ORDER BY id LIMIT 10`,
              timeout: 5000,
            },
            [lastId],
          );
          if (!rows.length) break;
          scanned[table] += rows.length;
          if (scanned[table] > 10000) throw new Error("Audit row limit");
          for (const row of rows)
            for (const field of fields) {
              const paths = legacyImagePaths(row[field]);
              if (paths.length)
                references.push({ resource: table, id: row.id, field, paths });
            }
          lastId = rows.at(-1)!.id;
        }
      }
      await connection.query({ sql: "ROLLBACK", timeout: 5000 });
    },
  );
  const report = {
    complete: true,
    mode: "read-only",
    generatedAt: new Date().toISOString(),
    scanned,
    references,
  };
  const output = process.argv
    .find((arg) => arg.startsWith("--output="))
    ?.slice(9);
  if (output) {
    await writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log(
      JSON.stringify({
        complete: true,
        scanned,
        matchedFields: references.length,
        output,
      }),
    );
  } else console.log(JSON.stringify(report, null, 2));
}
void main()
  .then(() => clearTimeout(watchdog))
  .catch(() => {
    console.error(
      "Image reference audit failed or incomplete; no files or database rows were changed.",
    );
    process.exit(1);
  });
