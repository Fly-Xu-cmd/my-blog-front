"use client";
import { useEffect, useState } from "react";
import { Button } from "antd";
import {
  isHistoryNavigation,
  readPositions,
  savePosition,
  type ReadingPosition,
} from "@/lib/reading-position";
export default function ReadingMemory({
  kind,
  id,
  version,
}: {
  kind: "post" | "note";
  id: number;
  version: string;
}) {
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    setRestored(false);
    const article = document.getElementById("article");
    if (!article) return;
    let active = true,
      touched = false,
      restoring = false,
      lastWrite = 0,
      cached: ReadingPosition | null = null;
    let noticeTimer: ReturnType<typeof setTimeout> | undefined;
    const cancelled = () => {
      touched = true;
    };
    const capture = () => {
      if (!article.isConnected || restoring) return;
      const top = article.getBoundingClientRect().top + scrollY;
      const target = [
        ...article.querySelectorAll<HTMLElement>(
          '.article-content [id^="block-"],.article-content [id^="heading-"]',
        ),
      ]
        .filter((n) => n.getBoundingClientRect().top <= 130)
        .at(-1);
      cached = {
        kind,
        id,
        version,
        visitedAt: Date.now(),
        ratio: Math.min(
          1,
          Math.max(
            0,
            (scrollY - top) / Math.max(article.offsetHeight - innerHeight, 1),
          ),
        ),
        anchor: target?.id ?? "",
        offset: target
          ? Math.min(
              100000,
              Math.max(0, -target.getBoundingClientRect().top + 130),
            )
          : 0,
      };
    };
    const flush = () => {
      if (cached)
        try {
          savePosition(cached);
        } catch {
          /* Position recovery is optional; reading remains available. */
        }
    };
    const scroll = () => {
      capture();
      if (Date.now() - lastWrite >= 1000) {
        lastWrite = Date.now();
        flush();
      }
    };
    const hidden = () => {
      if (document.hidden) flush();
    };
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
      window.addEventListener(event, cancelled, { passive: true });
    if (!location.hash && !isHistoryNavigation() && scrollY < 50) {
      let previous: ReadingPosition | undefined;
      try {
        previous = readPositions().find((r) => r.kind === kind && r.id === id);
      } catch {}
      if (
        previous &&
        previous.ratio > 0.04 &&
        previous.ratio < 0.98 &&
        Date.now() - previous.visitedAt < 7 * 86400000
      ) {
        restoring = true;
        void document.fonts.ready
          .then(
            () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => resolve()),
                ),
              ),
          )
          .then(() => {
            if (!active || touched) {
              restoring = false;
              return;
            }
            const anchor =
              previous!.version === version && previous!.anchor
                ? document.getElementById(previous!.anchor)
                : null;
            const top = anchor
              ? anchor.getBoundingClientRect().top +
                scrollY +
                previous!.offset -
                130
              : article.getBoundingClientRect().top +
                scrollY +
                previous!.ratio *
                  Math.max(article.offsetHeight - innerHeight, 1);
            window.scrollTo({ top, behavior: "instant" });
            restoring = false;
            capture();
            setRestored(true);
            noticeTimer = setTimeout(() => setRestored(false), 6000);
          });
      }
    }
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      active = false;
      flush();
      clearTimeout(noticeTimer);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hidden);
      for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
        window.removeEventListener(event, cancelled);
    };
  }, [kind, id, version]);
  return restored ? (
    <div className="reading-resume-notice" role="status">
      已恢复上次阅读位置
      <Button
        type="link"
        size="small"
        onClick={() => {
          setRestored(false);
          window.scrollTo({ top: 0, behavior: "instant" });
          try {
            savePosition({
              kind,
              id,
              version,
              ratio: 0,
              anchor: "",
              offset: 0,
              visitedAt: Date.now(),
            });
          } catch {}
        }}
      >
        从头阅读
      </Button>
    </div>
  ) : null;
}
