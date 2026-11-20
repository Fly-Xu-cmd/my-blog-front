"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input, Pagination, Segmented, Spin } from "antd";
import type { SearchHit, SearchType } from "@/lib/search";
import { shanghaiDate } from "@/lib/markdown";
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return text;
  const parts: React.ReactNode[] = [];
  const source = text.toLocaleLowerCase(),
    needle = q.toLocaleLowerCase();
  let offset = 0,
    at = source.indexOf(needle);
  while (at >= 0) {
    parts.push(
      text.slice(offset, at),
      <mark key={at}>{text.slice(at, at + q.length)}</mark>,
    );
    offset = at + q.length;
    at = source.indexOf(needle, offset);
  }
  parts.push(text.slice(offset));
  return <>{parts}</>;
}
export default function SearchResults({
  q: initialQuery,
  type: initialType,
  result: initialResult,
  error: initialError,
}: {
  q: string;
  type: SearchType;
  result: {
    data: SearchHit[];
    total: number;
    current: number;
    pageSize: number;
    pages: number;
  };
  error: string;
}) {
  const [input, setInput] = useState(initialQuery);
  const [q, setQuery] = useState(initialQuery);
  const [type, setType] = useState(initialType);
  const [result, setResult] = useState(initialResult);
  const [displayed, setDisplayed] = useState({
    q: initialQuery,
    type: initialType,
  });
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  const navigate = useCallback(
    async (query: string, filter: SearchType, current = 1, push = true) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      const params = new URLSearchParams({
        q: query.trim(),
        type: filter,
        current: String(current),
        pageSize: String(initialResult.pageSize),
      });
      if (push) window.history.pushState(null, "", "/search?" + params);
      setInput(query);
      setQuery(query.trim());
      setType(filter);
      setPending(true);
      setError("");
      try {
        const response = await fetch("/api/search?" + params, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search unavailable");
        const data = await response.json();
        if (!controller.signal.aborted) {
          setResult(data);
          setDisplayed({ q: query.trim(), type: filter });
        }
      } catch {
        if (!controller.signal.aborted) setError("搜索暂不可用，请稍后重试。");
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    },
    [initialResult.pageSize],
  );
  useEffect(() => {
    const back = () => {
      const params = new URLSearchParams(location.search);
      const type = params.get("type") ?? "all";
      void navigate(
        params.get("q") ?? "",
        type as SearchType,
        Number(params.get("current") ?? 1),
        false,
      );
    };
    window.addEventListener("popstate", back);
    return () => {
      request.current?.abort();
      window.removeEventListener("popstate", back);
    };
  }, [navigate]);
  return (
    <main className="editorial-page search-page">
      <header>
        <span className="editorial-eyebrow">找到需要的那一段</span>
        <h1>搜索</h1>
        <p>文章、技术笔记与随笔，一起查找。</p>
      </header>
      <div role="search" className="search-controls">
        <Input.Search
          aria-label="搜索文章和笔记"
          placeholder="输入标题或正文关键词"
          maxLength={100}
          allowClear
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSearch={(value) => navigate(value, type)}
          enterButton="搜索"
        />
        <Segmented
          aria-label="内容类型"
          options={[
            { label: "全部", value: "all" },
            { label: "文章", value: "post" },
            { label: "技术笔记", value: "TECH" },
            { label: "随笔", value: "ESSAY" },
          ]}
          value={type}
          onChange={(value) => navigate(q, value as SearchType)}
        />
      </div>
      <Spin spinning={pending}>
        {error && (
          <p role="alert" className="editorial-error">
            {error}
          </p>
        )}
        {!displayed.q ? (
          <p className="editorial-empty">输入关键词，开始查找。</p>
        ) : (
          <>
            <p className="search-count" role="status">
              {pending
                ? `正在搜索“${q}”…`
                : `“${displayed.q}” · ${result.total} 条结果`}
            </p>
            {result.data.length ? (
              <ul className="search-results">
                {result.data.map((hit) => (
                  <li key={hit.kind + hit.id}>
                    <div className="search-result-meta">
                      <span>
                        {hit.kind === "post"
                          ? "文章"
                          : hit.noteKind === "ESSAY"
                            ? "随笔"
                            : "技术笔记"}
                      </span>
                      {hit.publishedAt && (
                        <time
                          dateTime={new Date(hit.publishedAt).toISOString()}
                        >
                          {shanghaiDate(hit.publishedAt)}
                        </time>
                      )}
                    </div>
                    <h2>
                      <Link
                        href={
                          (hit.kind === "post" ? "/posts/" : "/notes/") +
                          hit.slug
                        }
                      >
                        <Highlight text={hit.title} q={displayed.q} />
                      </Link>
                    </h2>
                    <p>
                      <Highlight text={hit.snippet} q={displayed.q} />
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="editorial-empty">
                没有找到相关内容，试试更短的关键词。
              </p>
            )}
            {!!result.total && (
              <Pagination
                current={result.current}
                pageSize={result.pageSize}
                total={result.total}
                showSizeChanger={false}
                onChange={(current) =>
                  navigate(displayed.q, displayed.type, current)
                }
              />
            )}
          </>
        )}
      </Spin>
    </main>
  );
}
