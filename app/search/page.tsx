import type { Metadata } from "next";
import { searchContent, searchParams } from "@/lib/search";
import { serialize } from "@/lib/public-content";
import SearchResults from "./SearchResults";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "搜索",
  description: "在文章、技术笔记和随笔中查找。",
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};
export default async function SearchPage({
  searchParams: input,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const values = await input;
  const params = new URLSearchParams();
  for (const key of ["q", "type", "current", "pageSize"]) {
    const value = values[key];
    if (typeof value === "string") params.set(key, value);
  }
  let settings,
    results,
    error = "";
  try {
    settings = searchParams(params);
    results = await searchContent(params);
  } catch (e) {
    error =
      e instanceof Error && "status" in e && e.status === 400
        ? "搜索参数无效，请重新搜索。"
        : "搜索暂不可用，请稍后重试。";
  }
  return (
    <SearchResults
      key={params.toString()}
      q={settings?.q ?? ""}
      type={settings?.type ?? "all"}
      result={
        results
          ? serialize(results)
          : { data: [], total: 0, current: 1, pageSize: 10, pages: 0 }
      }
      error={error}
    />
  );
}
