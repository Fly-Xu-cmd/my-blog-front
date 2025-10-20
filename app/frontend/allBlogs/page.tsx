"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Image as ImageIcon } from "lucide-react"; // 用于无封面占位
// import { posts } from "../../data/posts";
import Image from "next/image";
import { useEffect, useState } from "react";
import { type Post } from "@/app/frontend/model";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * 完整版博客瀑布流页面
 * ✅ Masonry布局
 * ✅ 封面图 + 动画 + 占位图兼容
 * ✅ 响应式 + 优雅阴影 + 进入动画
 */
// 获取所有博客
const fetchAllBlogs = async () => {
  const res = await fetch("/api/posts");
  return res.json();
};

export default function AllBlogs() {
  // 状态管理：存储从API获取的博客数据
  const [posts, setPosts] = useState<Post[]>([]);

  // 从API获取所有博客
  useEffect(() => {
    fetchAllBlogs().then((blogs) => {
      setPosts(blogs);
    });
  }, []);

  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // 日期格式化
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-blue-50 via-white to-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
            博客瀑布流
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            ✨ 探索所有的思想点滴，发现文字背后的故事
          </p>
        </div>

        {/* Masonry布局 */}
        <div
          className="
            columns-1 sm:columns-2 lg:columns-3
            gap-6 [column-fill:_balance]
          "
        >
          {sortedPosts.map((post) => (
            <motion.div
              key={post.id}
              className="mb-6 break-inside-avoid"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: Math.random() * 0.3,
                ease: "easeOut",
              }}
            >
              <div
                className="
                  bg-white rounded-2xl overflow-hidden shadow-md
                  hover:shadow-xl transition-all duration-300 hover:-translate-y-1
                  border border-gray-100 flex flex-col
                "
              >
                {/* 封面区域 */}
                {post.cover ? (
                  <div className="relative w-full overflow-hidden">
                    <Image
                      src={post.cover}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      width={400}
                      height={200}
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-48 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <ImageIcon className="w-10 h-10 text-gray-400" />
                    <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                      无封面
                    </span>
                  </div>
                )}

                {/* 内容部分 */}
                <div className="p-5 flex flex-col flex-grow">
                  {/* 日期 */}
                  <div className="mb-2">
                    <span className="inline-block  py-1 text-xs font-medium  text-blue-700 rounded-full">
                      {formatDate(post.createdAt)}
                    </span>
                  </div>

                  {/* 标题 */}
                  <h2 className="text-lg font-semibold mb-2 text-gray-800 line-clamp-2">
                    <Link
                      href={`posts/${post.slug}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h2>

                  {/* 摘要 */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {post.excerpt}
                    </ReactMarkdown>
                  </p>

                  {/* 阅读更多 */}
                  <Link
                    href={`posts/${post.slug}`}
                    className="mt-auto inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    阅读更多
                    <svg
                      className="w-4 h-4 ml-1 transition-transform duration-200 group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
