"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Input,
  Modal,
  Pagination,
  Segmented,
  Spin,
  type InputRef,
} from "antd";
import { Search } from "lucide-react";
import type { SearchHit, SearchResult, SearchType } from "@/lib/search";
import { trackInteraction } from "@/lib/interaction-client";
import { literalMatches } from "@/lib/text-match";
const labels = { post: "文章", TECH: "技术笔记", ESSAY: "随笔" };
const groupOf = (hit: SearchHit) =>
  hit.kind === "post" ? "post" : hit.noteKind === "ESSAY" ? "ESSAY" : "TECH";
const hrefOf = (hit: SearchHit, query: string) =>
  (hit.kind === "post" ? "/posts/" : "/notes/") +
  hit.slug +
  "?highlight=" +
  encodeURIComponent(query) +
  "#search-" +
  (hit.matchOffset ?? "title");
function repeatArrival(href: string) {
  if (new URL(href, location.origin).href === location.href)
    window.dispatchEvent(new Event("blog-search-arrival"));
}
function Highlight({ text, query }: { text: string; query: string }) {
  const parts: React.ReactNode[] = [];
  let start = 0;
  if (!query) return text;
  for (const { start: at, end } of literalMatches(text, query)) {
    parts.push(
      text.slice(start, at),
      <mark key={at}>{text.slice(at, end)}</mark>,
    );
    start = end;
  }
  return (
    <>
      {parts}
      {text.slice(start)}
    </>
  );
}
const empty: SearchResult = {
  data: [],
  total: 0,
  current: 1,
  pageSize: 12,
  pages: 0,
  groups: { post: 0, TECH: 0, ESSAY: 0 },
};
export default function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState(""),
    [type, setType] = useState<SearchType>("all"),
    [result, setResult] = useState(empty),
    [displayed, setDisplayed] = useState({
      query: "",
      type: "all" as SearchType,
    }),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [active, setActive] = useState(-1);
  const controller = useRef<AbortController | null>(null),
    input = useRef<InputRef>(null),
    sequence = useRef(0);
  const rows = ["post", "TECH", "ESSAY"].flatMap((group) =>
    result.data.filter((hit) => groupOf(hit) === group),
  );
  const search = useCallback(
    async (value: string, filter: SearchType, current = 1) => {
      controller.current?.abort();
      const serial = ++sequence.current;
      if (!value.trim()) {
        setResult(empty);
        setDisplayed({ query: "", type: filter });
        setPending(false);
        setError("");
        return;
      }
      const abort = new AbortController();
      controller.current = abort;
      setPending(true);
      setError("");
      setActive(-1);
      try {
        const response = await fetch(
          "/api/search?" +
            new URLSearchParams({
              q: value.trim(),
              type: filter,
              current: String(current),
              pageSize: "12",
            }),
          { signal: abort.signal },
        );
        if (!response.ok) throw new Error();
        const next = (await response.json()) as SearchResult;
        if (serial !== sequence.current) return;
        setResult(next);
        setDisplayed({ query: value.trim(), type: filter });
        if (current === 1) {
          trackInteraction("search", filter);
          if (next.total === 0) trackInteraction("search_empty", filter);
        }
      } catch {
        if (!abort.signal.aborted && serial === sequence.current)
          setError("搜索暂不可用，已保留上次结果。请重新搜索。");
      } finally {
        if (serial === sequence.current) setPending(false);
      }
    },
    [],
  );
  const cancel = useCallback(() => {
    ++sequence.current;
    controller.current?.abort();
  }, []);
  useEffect(() => {
    input.current?.focus();
    return cancel;
  }, [cancel]);
  useEffect(() => {
    controller.current?.abort();
    ++sequence.current;
    const timer = setTimeout(() => void search(query, type), 300);
    return () => clearTimeout(timer);
  }, [query, type, search]);
  useEffect(() => {
    document
      .getElementById("search-result-" + active)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);
  return (
    <Modal
      open
      title="搜索"
      footer={null}
      onCancel={() => {
        onClose();
        document
          .querySelector<HTMLButtonElement>('button[aria-label="搜索"]')
          ?.focus({ preventScroll: true });
      }}
      focusTriggerAfterClose={false}
      width={760}
      zIndex={11000}
      className="blog-search-dialog"
      afterOpenChange={(open) => {
        if (open) input.current?.focus();
      }}
    >
      <div className="search-dialog-heading">
        <Search size={20} />
        <h2>找到需要的那一段</h2>
      </div>
      <Input.Search
        ref={input}
        aria-label="搜索文章和笔记"
        aria-controls="blog-search-results"
        aria-activedescendant={
          active >= 0 ? "search-result-" + active : undefined
        }
        placeholder="输入标题或正文关键词"
        maxLength={100}
        allowClear
        value={query}
        onChange={(e) => {
          controller.current?.abort();
          ++sequence.current;
          setActive(-1);
          setQuery(e.target.value);
        }}
        onSearch={(value) => {
          if (active < 0) void search(value, type);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (rows.length)
              setActive((previous) =>
                previous < 0
                  ? e.key === "ArrowDown"
                    ? 0
                    : rows.length - 1
                  : (previous +
                      (e.key === "ArrowDown" ? 1 : -1) +
                      rows.length) %
                    rows.length,
              );
          }
          if (
            e.key === "Enter" &&
            active >= 0 &&
            rows[active] &&
            query.trim() === displayed.query
          ) {
            e.preventDefault();
            trackInteraction(
              "search_click",
              rows[active].kind + ":" + rows[active].id,
            );
            const href = hrefOf(rows[active], displayed.query);
            repeatArrival(href);
            router.push(href, { scroll: false });
            onClose();
          }
        }}
      />
      <Segmented
        aria-label="搜索内容类型"
        block
        value={type}
        options={[
          { label: "全部", value: "all" },
          ...(["post", "TECH", "ESSAY"] as const).map((group) => ({
            label:
              labels[group] +
              (displayed.query ? " " + result.groups[group] : ""),
            value: group,
          })),
        ]}
        onChange={(value) => setType(value as SearchType)}
      />
      <div
        className="search-dialog-body"
        id="blog-search-results"
        aria-busy={pending}
      >
        {error && (
          <p role="alert" className="editorial-error">
            {error}
          </p>
        )}
        {!query.trim() ? (
          <div className="search-placeholder">
            <p>从一个关键词开始</p>
            <span>可以查找标题，也可以找到正文里记得的那句话。</span>
            <div>
              {["slug", "Next.js", "阅读"].map((word) => (
                <Button size="small" key={word} onClick={() => setQuery(word)}>
                  {word}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <Spin spinning={pending}>
            <p className="search-count" role="status">
              {pending
                ? "正在搜索…"
                : displayed.query
                  ? `“${displayed.query}” · ${result.total} 条结果`
                  : ""}
            </p>
            {!!result.data.length &&
              (["post", "TECH", "ESSAY"] as const).map((group) => {
                const hits = result.data.filter(
                  (hit) => groupOf(hit) === group,
                );
                if (!hits.length) return null;
                return (
                  <section
                    className="search-result-group"
                    key={group}
                    aria-label={labels[group]}
                  >
                    <h3>
                      {labels[group]}
                      <span>{result.groups[group]}</span>
                    </h3>
                    <ul className="search-results">
                      {hits.map((hit) => {
                        const index = rows.indexOf(hit);
                        return (
                          <li
                            key={hit.kind + hit.id}
                            id={"search-result-" + index}
                            className={active === index ? "is-active" : ""}
                          >
                            <Link
                              href={hrefOf(hit, displayed.query)}
                              scroll={false}
                              onClick={() => {
                                repeatArrival(hrefOf(hit, displayed.query));
                                onClose();
                              }}
                              data-interaction="search_click"
                              data-target={hit.kind + ":" + hit.id}
                            >
                              <h4>
                                <Highlight
                                  text={hit.title}
                                  query={displayed.query}
                                />
                              </h4>
                              <p>
                                <Highlight
                                  text={hit.snippet}
                                  query={displayed.query}
                                />
                              </p>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            {!pending && displayed.query && !result.total && (
              <p className="editorial-empty">
                没有找到相关内容，试试更短的关键词或切换“全部”。
              </p>
            )}
            {result.total > result.pageSize && (
              <Pagination
                size="small"
                current={result.current}
                pageSize={result.pageSize}
                total={result.total}
                showSizeChanger={false}
                onChange={(current) =>
                  void search(displayed.query, displayed.type, current)
                }
              />
            )}
          </Spin>
        )}
      </div>
      <div className="search-dialog-hint">↑ ↓ 选择 · Enter 打开 · Esc 关闭</div>
    </Modal>
  );
}
