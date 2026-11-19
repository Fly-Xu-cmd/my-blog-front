import "dotenv/config";
import mysql from "mysql2/promise";
import { writeFile } from "node:fs/promises";
import { withAuditConnection } from "../lib/audit-connection";
import { legacyImagePaths } from "../lib/image-reference-audit";

const url = process.env.AUDIT_DATABASE_URL;
if (!url) throw new Error("Specify a read-only AUDIT_DATABASE_URL");
const watchdog = setTimeout(() => {
  console.error("Site settings audit timed out");
  process.exit(1);
}, 180000);
async function main() {
  const references: {
    id: number;

    paths: string[];
  }[] = [];
  let scanned = 0;
  await withAuditConnection(
    () => mysql.createConnection(url!),
    async (connection) => {
      await connection.query({
        sql: "SET SESSION TRANSACTION READ ONLY",
        timeout: 5000,
      });
      await connection.query({
        sql: "START TRANSACTION WITH CONSISTENT SNAPSHOT",
        timeout: 5000,
      });
      let last = 0;
      while (true) {
        const [rows] = await connection.query<mysql.RowDataPacket[]>(
          {
            sql: "SELECT id,fields AS snapshot FROM SiteSettings WHERE id > ? ORDER BY id LIMIT 10",
            timeout: 5000,
          },
          [last],
        );
        if (!rows.length) break;
        scanned += rows.length;
        if (scanned > 10000) throw new Error("Audit row limit");
        for (const row of rows) {
          const snapshot =
            typeof row.snapshot === "string"
              ? JSON.parse(row.snapshot)
              : row.snapshot;
          const paths = [
            ...new Set(
              ["avatar", "wechatQr", "qqQr"].flatMap((field) =>
                legacyImagePaths(snapshot[field]),
              ),
            ),
          ];
          if (paths.length)
            references.push({
              id: row.id,

              paths,
            });
        }
        last = rows.at(-1)!.id;
      }
      await connection.query({ sql: "ROLLBACK", timeout: 5000 });
    },
  );
  const report = {
    complete: true,
    generatedAt: new Date().toISOString(),
    scanned,
    references,
  };
  const output = process.argv
    .find((arg) => arg.startsWith("--output="))
    ?.slice(9);
  if (output)
    await writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(
    JSON.stringify(
      output
        ? { complete: true, scanned, matched: references.length, output }
        : report,
    ),
  );
}
void main()
  .then(() => clearTimeout(watchdog))
  .catch(() => {
    console.error(
      "Site settings audit failed; no content or files were changed.",
    );
    process.exit(1);
  });
