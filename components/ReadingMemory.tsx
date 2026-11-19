"use client";
import { Button, App } from "antd";
import { useEffect, useRef, useState } from "react";
import {
  readingEvent,
  readReadingState,
  refKey,
  updateReading,
  type ReadingRecord,
  type ReadingRef,
} from "@/lib/reading-state";
export default function ReadingMemory({ kind, id }: ReadingRef) {
  const { message } = App.useApp();
  const [saved, setSaved] = useState(false),
    [resume, setResume] = useState<ReadingRecord | null>(null),
    [error, setError] = useState("");
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    setResume(null);
    setSaved(false);
    setError("");
    const ref = { kind, id };
    const article = document.getElementById("article");
    const headings = article
      ? [...article.querySelectorAll<HTMLElement>("h2[id],h3[id],h4[id]")]
      : [];
    let position: { ratio: number; heading: string } | null = null;
    let lastWrite = 0,
      touched = false;
    const refresh = () => {
      try {
        const row = readReadingState().find((r) => refKey(r) === refKey(ref));
        setSaved(row?.saved ?? false);
      } catch {
        setError("浏览器存储不可用，阅读记录未保存。");
      }
    };
    try {
      const row = readReadingState().find((r) => refKey(r) === refKey(ref));
      if (row && row.ratio > 0.04 && row.ratio < 0.98) setResume(row);
      updateReading(ref, { visitedAt: Date.now() });
    } catch {
      setError("浏览器存储不可用，阅读记录未保存。");
    }
    refresh();
    const savePosition = () => {
      if (!touched || !position) return;
      try {
        updateReading(ref, { ...position, visitedAt: Date.now() });
      } catch {
        if (active.current) setError("浏览器存储不可用，阅读位置未保存。");
      }
    };
    const scroll = () => {
      if (!article?.isConnected) return;
      touched = true;
      const top = article.getBoundingClientRect().top + scrollY,
        range = Math.max(article.offsetHeight - innerHeight, 1);
      position = {
        ratio: Math.min(1, Math.max(0, (scrollY - top) / range)),
        heading:
          headings.filter((h) => h.getBoundingClientRect().top <= 130).at(-1)
            ?.id ?? "",
      };
      const now = Date.now();
      if (now - lastWrite < 1000) return;
      lastWrite = now;
      savePosition();
    };
    const visibility = () => {
      if (document.hidden) savePosition();
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pagehide", savePosition);
    window.addEventListener("storage", refresh);
    window.addEventListener(readingEvent, refresh);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      savePosition();
      active.current = false;
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pagehide", savePosition);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(readingEvent, refresh);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [kind, id]);
  return (
    <div className="reading-memory">
      <Button
        type="text"
        size="small"
        aria-pressed={saved}
        onClick={() => {
          try {
            updateReading(
              { kind, id },
              { saved: !saved, visitedAt: Date.now() },
            );
            setSaved(!saved);
            message.success(saved ? "已移出稍后再读" : "已加入稍后再读");
          } catch {
            setError("浏览器存储不可用，未保存。");
          }
        }}
      >
        {saved ? "已加入稍后再读" : "稍后再读"}
      </Button>
      {resume && (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => {
              const anchor =
                resume.heading && document.getElementById(resume.heading);
              const article = document.getElementById("article");
              if (anchor)
                anchor.scrollIntoView({ block: "start", behavior: "auto" });
              else if (article)
                window.scrollTo({
                  top:
                    article.getBoundingClientRect().top +
                    scrollY +
                    resume.ratio *
                      Math.max(article.offsetHeight - innerHeight, 1),
                  behavior: "auto",
                });
              setResume(null);
            }}
          >
            继续上次阅读 · {Math.round(resume.ratio * 100)}%
          </Button>
          <Button
            type="text"
            size="small"
            aria-label="忽略上次阅读位置"
            onClick={() => setResume(null)}
          >
            从头读
          </Button>
        </>
      )}
      {error && (
        <span role="status" className="text-xs text-gray-500">
          {error}
        </span>
      )}
    </div>
  );
}
