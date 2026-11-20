"use client";
import Link from "next/link";
import { Alert, App, Button, Segmented, Spin } from "antd";
import { useEffect, useState } from "react";
import {
  readingEvent,
  readReadingState,
  mutateReading,
  refKey,
  type ReadingRecord,
} from "@/lib/reading-state";
type Item = ReadingRecord & {
  title: string;
  slug: string;
  excerpt: string | null;
};
export default function ReadingLibrary() {
  const { modal } = App.useApp();
  const [items, setItems] = useState<Item[]>([]),
    [filter, setFilter] = useState("recent"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let controller: AbortController | null = null;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      const current = controller;
      setLoading(true);
      setError("");
      try {
        const records = readReadingState();
        if (!records.length) {
          setItems([]);
          return;
        }
        const response = await fetch("/api/reading-library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: records.map(({ kind, id }) => ({ kind, id })),
          }),
          signal: current.signal,
        });
        if (!response.ok) throw new Error("读取失败");
        const data = await response.json();
        if (current.signal.aborted) return;
        setItems(
          records.flatMap((record) => {
            const row = data.data.find(
              (r: Item) => refKey(r) === refKey(record),
            );
            return row ? [{ ...row, ...record }] : [];
          }),
        );
      } catch {
        if (!current.signal.aborted)
          setError("阅读清单暂不可用。本地记录已保留，请重试。");
      } finally {
        if (!current.signal.aborted) setLoading(false);
      }
    };
    void load();
    window.addEventListener("storage", load);
    window.addEventListener(readingEvent, load);
    return () => {
      controller?.abort();
      window.removeEventListener("storage", load);
      window.removeEventListener(readingEvent, load);
    };
  }, [reload]);
  const visible =
    filter === "saved"
      ? items.filter((r) => r.saved)
      : items
          .filter((r) => r.visitedAt > 0)
          .sort((a, b) => b.visitedAt - a.visitedAt)
          .slice(0, 30);
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Segmented
          aria-label="阅读清单"
          value={filter}
          onChange={(value) => setFilter(String(value))}
          options={[
            { label: "最近阅读", value: "recent" },
            { label: "稍后再读", value: "saved" },
          ]}
        />
        <Button
          type="text"
          onClick={() =>
            modal.confirm({
              title: "清空当前浏览器的阅读记录？",
              content: "同时清空最近阅读、位置与稍后再读。",
              okText: "清空记录",
              cancelText: "保留",
              onOk: () => {
                try {
                  mutateReading(() => []);
                } catch {
                  setError("浏览器存储不可用，未清空。");
                }
              },
            })
          }
        >
          清空记录
        </Button>
      </div>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={<Button onClick={() => setReload(reload + 1)}>重试</Button>}
        />
      )}
      <Spin spinning={loading}>
        <ul className="search-results reading-library">
          {!error &&
            visible.map((row) => (
              <li key={refKey(row)}>
                <span className="text-xs text-gray-500">
                  {row.kind === "post" ? "文章" : "笔记"} ·{" "}
                  {Math.round(row.ratio * 100)}%
                </span>
                <h2>
                  <Link
                    href={
                      (row.kind === "post" ? "/posts/" : "/notes/") + row.slug
                    }
                  >
                    {row.title}
                  </Link>
                </h2>
                {row.excerpt && <p>{row.excerpt}</p>}
                {row.saved && (
                  <Button
                    type="text"
                    size="small"
                    onClick={() => {
                      try {
                        mutateReading((records) =>
                          records.map((r) =>
                            refKey(r) === refKey(row)
                              ? { ...r, saved: false }
                              : r,
                          ),
                        );
                      } catch {
                        setError("浏览器存储不可用，未移除。");
                      }
                    }}
                  >
                    移出稍后再读
                  </Button>
                )}
              </li>
            ))}
        </ul>
        {!loading && !error && !visible.length && (
          <p className="editorial-empty">
            {filter === "saved"
              ? "还没有稍后再读的内容。阅读时可以在标题下添加。"
              : "还没有最近阅读记录。已隐藏或删除的内容不会展示。"}
          </p>
        )}
      </Spin>
      <noscript>
        阅读清单保存在当前浏览器，需要启用 JavaScript
        才能读取；正文仍可正常阅读。
      </noscript>
    </section>
  );
}
