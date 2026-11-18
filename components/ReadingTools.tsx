'use client';
import { useEffect, useState } from 'react';
export default function ReadingTools({ path }: { path: string }) {
  const [views, setViews] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    void fetch('/api/analytics/views?path=' + encodeURIComponent(path), { signal: abort.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => {
        if (r) setViews(r.views);
      })
      .catch(() => {});
    const update = () => {
      const article = document.getElementById('article');
      if (!article) return;
      const top = article.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(article.offsetHeight - window.innerHeight, 1);
      setProgress(Math.max(0, Math.min(100, ((window.scrollY - top) / range) * 100)));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      abort.abort();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [path]);
  return (
    <>
      <div
        className="fixed top-0 left-0 h-0.5 bg-cyan-500 z-[10000]"
        style={{ width: progress + '%' }}
        aria-hidden="true"
      />
      <span className="text-sm text-gray-500">{views === null ? '—' : views} 次阅读</span>
    </>
  );
}
