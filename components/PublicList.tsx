'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { shanghaiDate } from '@/lib/markdown';
export type Summary = {
  id: number;
  title: string | null;
  slug?: string;
  excerpt: string | null;
  createdAt: string;
  publishedAt: string | null;
  category?: { name: string } | null;
  tags?: string[];
  cover?: string | null;
  kind?: string;
};
export type Listing = {
  data: Summary[];
  total: number;
  current: number;
  pageSize: number;
  pages: number;
};
export default function PublicList({
  resource,
  initial,
  categories = [],
  tags = [],
  fixedTag,
}: {
  resource: 'post' | 'note' | 'dynamic';
  initial: Listing;
  categories?: string[];
  tags?: string[];
  fixedTag?: string;
}) {
  const [state, setState] = useState(initial);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState(fixedTag ?? '');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!query && !category && tag === (fixedTag ?? '') && page === 1) {
      setState(initial);
      setError('');
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ current: String(page), pageSize: '10', q: query });
      if (category) params.set('category', category);
      if (tag) params.set('tags', tag);
      void fetch(
        '/api/' + { post: 'posts', note: 'notes', dynamic: 'dynamics' }[resource] + '?' + params,
        { signal: abort.signal },
      )
        .then(async (r) => {
          if (!r.ok) throw new Error('加载失败，请重试');
          return r.json();
        })
        .then((r) => {
          if (!abort.signal.aborted) setState(r);
        })
        .catch((e) => {
          if (!abort.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query, category, tag, page, resource, initial, fixedTag]);
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap gap-3 mb-8">
        <input
          aria-label="搜索标题或正文"
          placeholder="搜索标题或正文"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border p-3 bg-transparent"
        />
        {categories.length > 0 && (
          <select
            aria-label="分类"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg p-3 bg-transparent"
          >
            <option value="">全部分类</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
        {!fixedTag && tags.length > 0 && (
          <select
            aria-label="标签"
            value={tag}
            onChange={(e) => {
              setTag(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg p-3 bg-transparent"
          >
            <option value="">全部标签</option>
            {tags.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        )}
        <span role="status" className="self-center text-sm text-gray-500">
          {loading ? '加载中…' : state.total + ' 条内容'}
        </span>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.data.map((item) => (
          <article
            key={item.id}
            className="min-w-0 rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/[0.04] p-6"
          >
            {item.cover && (
              <Image
                unoptimized
                width={800}
                height={450}
                src={item.cover}
                alt=""
                className="w-full aspect-video object-cover rounded-lg mb-4"
              />
            )}
            <time className="text-sm text-gray-500">
              {shanghaiDate(item.publishedAt ?? item.createdAt)}
            </time>
            <h2 className="text-xl font-bold mt-3 mb-3">
              <Link
                href={
                  resource === 'dynamic'
                    ? '/status/' + item.id
                    : (resource === 'post' ? '/posts/' : '/notes/') + item.slug
                }
              >
                {item.title || '动态'}
              </Link>
            </h2>
            <p className="text-gray-500 break-words line-clamp-3">{item.excerpt || '暂无摘要'}</p>
            <p className="text-cyan-600 text-sm mt-4">
              {item.category?.name} {item.tags?.map((t) => '#' + t).join(' ')}
            </p>
          </article>
        ))}
      </div>
      {!state.data.length && <p className="py-10 text-center text-gray-500">没有匹配的内容</p>}
      {state.pages > 1 && (
        <nav aria-label="分页" className="flex justify-center gap-5 mt-8">
          <button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            上一页
          </button>
          <span>
            {page}/{state.pages}
          </span>
          <button disabled={page >= state.pages || loading} onClick={() => setPage((p) => p + 1)}>
            下一页
          </button>
        </nav>
      )}
    </div>
  );
}
