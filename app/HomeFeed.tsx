'use client';
import { useState } from 'react';
import PublicList, { Listing } from '@/components/PublicList';
import Link from 'next/link';
export default function HomeFeed({
  posts,
  dynamics,
  postError,
  dynamicError,
}: {
  posts: Listing;
  dynamics: Listing;
  postError?: boolean;
  dynamicError?: boolean;
}) {
  const [tab, setTab] = useState<'post' | 'dynamic'>('post');
  return (
    <div className="w-full">
      <section className="max-w-4xl mx-auto text-center px-4 py-14">
        <h1 className="text-4xl font-bold mb-5">若木的小世界</h1>
        <p className="text-gray-500 text-lg">记录前端、后端与 AI 应用实践，也留下生活中的思考。</p>
        <div className="flex justify-center gap-5 mt-6">
          <Link href="/feed.xml" className="text-cyan-600">
            RSS 订阅
          </Link>
          <Link href="/archive">文章归档</Link>
        </div>
        <div className="flex justify-center gap-3 mt-8">
          <button
            className="rounded-full border px-5 py-2"
            aria-pressed={tab === 'post'}
            onClick={() => setTab('post')}
          >
            最新博客
          </button>
          <button
            className="rounded-full border px-5 py-2"
            aria-pressed={tab === 'dynamic'}
            onClick={() => setTab('dynamic')}
          >
            最新动态
          </button>
        </div>
      </section>
      {(tab === 'post' ? postError : dynamicError) ? (
        <p role="alert" className="text-center">
          内容暂不可用，请稍后刷新
        </p>
      ) : (
        <PublicList key={tab} resource={tab} initial={tab === 'post' ? posts : dynamics} />
      )}
    </div>
  );
}
