import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { ApiError, pagination } from "./api";
import { searchSnippet } from "./markdown";
export type SearchType = "all" | "post" | "TECH" | "ESSAY";
export type SearchHit = {
  id: number;
  kind: "post" | "note";
  noteKind: string | null;
  title: string;
  slug: string;
  snippet: string;
  publishedAt: Date | string | null;
  matchOffset: number | null;
};
export type SearchResult = {
  data: SearchHit[];
  total: number;
  current: number;
  pageSize: number;
  pages: number;
  groups: Record<"post" | "TECH" | "ESSAY", number>;
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
      groups: { post: 0, TECH: 0, ESSAY: 0 },
    };
  // Literal substring semantics: %, _ and backslashes are ordinary search characters.
  const condition = Prisma.sql`(LOCATE(${q},title) > 0 OR LOCATE(${q},content) > 0)`;
  const projection = Prisma.sql`id,title,slug,publishedAt,LOCATE(${q},content)-1 AS matchOffset,GREATEST(0,LOCATE(${q},content)-4097) AS windowOffset,SUBSTRING(content,GREATEST(1,LOCATE(${q},content)-4096),8192) AS contentWindow`;
  const queries: Prisma.Sql[] = [];
  queries.push(
    Prisma.sql`SELECT 'post' AS kind,NULL AS noteKind,${projection} FROM Post WHERE published=true AND ${condition}`,
  );
  queries.push(
    Prisma.sql`SELECT 'note' AS kind,kind AS noteKind,${projection} FROM Note WHERE published=true AND ${condition}`,
  );
  const union = Prisma.join(queries, " UNION ALL ");
  const filter =
    type === "all"
      ? Prisma.empty
      : type === "post"
        ? Prisma.sql`WHERE kind='post'`
        : Prisma.sql`WHERE noteKind=${type}`;
  const [counts, rows] = await prisma.$transaction(
    async (tx) => {
      const count = await tx.$queryRaw<
        { kind: string; noteKind: string | null; total: bigint }[]
      >(
        Prisma.sql`SELECT /*+ MAX_EXECUTION_TIME(3000) */ kind,noteKind,COUNT(*) AS total FROM (${union}) AS matches GROUP BY kind,noteKind`,
      );
      const rows = await tx.$queryRaw<
        (SearchHit & { contentWindow: string; windowOffset: number })[]
      >(
        Prisma.sql`SELECT /*+ MAX_EXECUTION_TIME(3000) */ * FROM (${union}) AS matches ${filter} ORDER BY publishedAt DESC,kind ASC,id DESC LIMIT ${take} OFFSET ${skip}`,
      );
      return [count, rows] as const;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 10000,
    },
  );
  const groups = { post: 0, TECH: 0, ESSAY: 0 };
  for (const row of counts)
    groups[
      row.kind === "post" ? "post" : row.noteKind === "ESSAY" ? "ESSAY" : "TECH"
    ] = Number(row.total);
  const total =
    type === "all" ? groups.post + groups.TECH + groups.ESSAY : groups[type];
  return {
    ok: true,
    data: rows.map(({ contentWindow, windowOffset, matchOffset, ...row }) => ({
      ...row,
      matchOffset: Number(matchOffset) >= 0 ? Number(matchOffset) : null,
      snippet: searchSnippet(
        contentWindow,
        q,
        Number(matchOffset) - Number(windowOffset),
      ),
    })),
    total,
    current,
    pageSize,
    pages: Math.ceil(total / pageSize),
    groups,
  };
}
