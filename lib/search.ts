import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { ApiError, pagination } from "./api";
import { extractDescription } from "./seo";
export type SearchType = "all" | "post" | "TECH" | "ESSAY";
export type SearchHit = {
  id: number;
  kind: "post" | "note";
  noteKind: string | null;
  title: string;
  slug: string;
  snippet: string;
  publishedAt: Date | string | null;
};
export function searchParams(params: URLSearchParams) {
  const q = (params.get("q") ?? "").trim();
  const type = params.get("type") ?? "all";
  if (q.length > 100 || !["all", "post", "TECH", "ESSAY"].includes(type))
    throw new ApiError(400, "INVALID_SEARCH");
  return { q, type: type as SearchType, ...pagination(params) };
}
export async function searchContent(params: URLSearchParams) {
  const { q, type, current, pageSize, skip, take } = searchParams(params);
  if (!q)
    return {
      ok: true,
      data: [] as SearchHit[],
      total: 0,
      current,
      pageSize,
      pages: 0,
    };
  // Literal substring semantics: %, _ and backslashes are ordinary search characters.
  const condition = Prisma.sql`(LOCATE(${q},title) > 0 OR LOCATE(${q},content) > 0)`;
  const projection = Prisma.sql`id,title,slug,publishedAt,SUBSTRING(content,GREATEST(1,LOCATE(${q},content)-50),240) AS snippet`;
  const queries: Prisma.Sql[] = [];
  if (type === "all" || type === "post")
    queries.push(
      Prisma.sql`SELECT 'post' AS kind,NULL AS noteKind,${projection} FROM Post WHERE published=true AND ${condition}`,
    );
  if (type !== "post")
    queries.push(
      Prisma.sql`SELECT 'note' AS kind,kind AS noteKind,${projection} FROM Note WHERE published=true AND ${condition} ${type === "all" ? Prisma.empty : Prisma.sql`AND kind=${type}`}`,
    );
  const union = Prisma.join(queries, " UNION ALL ");
  const [count, rows] = await prisma.$transaction(
    async (tx) => {
      const count = await tx.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`SELECT /*+ MAX_EXECUTION_TIME(3000) */ COUNT(*) AS total FROM (${union}) AS matches`,
      );
      const rows = await tx.$queryRaw<SearchHit[]>(
        Prisma.sql`SELECT /*+ MAX_EXECUTION_TIME(3000) */ * FROM (${union}) AS matches ORDER BY publishedAt DESC,kind ASC,id DESC LIMIT ${take} OFFSET ${skip}`,
      );
      return [count, rows] as const;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 10000,
    },
  );
  const total = Number(count[0].total);
  return {
    ok: true,
    data: rows.map((row) => ({
      ...row,
      snippet: extractDescription(row.snippet, 200),
    })),
    total,
    current,
    pageSize,
    pages: Math.ceil(total / pageSize),
  };
}
