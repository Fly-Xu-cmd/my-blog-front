"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { type Post } from "@/app/frontend/model";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 获取所有博客
const fetchAllBlogs = async () => {
  const res = await fetch("/api/posts");
  return res.json();
};

export default function AllBlogsClient() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    fetchAllBlogs().then((data) => {
      if (data.ok) {
        setPosts(data.data);
      }
    });
  }, []);

  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const getImageUrl = (post: Post) => {
    if (post.cover && post.cover.startsWith("http")) {
      return post.cover;
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://101.132.178.33";
    return `${baseUrl}${post.cover}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className="w-full py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Masonry布局 */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
          {sortedPosts.map((post) => (
            <motion.div
              key={post.id}
              className="mb-6 break-inside-avoid"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:bg-white/[0.04] dark:border-white/10 dark:backdrop-blur-xl dark:hover:border-cyan-400/40 dark:hover:shadow-[0_0_40px_rgba(34,211,238,0.12)] flex flex-col">
                {/* 封面区域 */}
                {post.cover ? (
                  <div className="relative w-full aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-white/5">
                    <Image
                      src={getImageUrl(post)}
                      alt={post.title}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="relative w-full aspect-[16/10] flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/5 dark:to-white/[0.02]">
                    <ImageIcon className="w-10 h-10 text-gray-400 dark:text-white/20" />
                  </div>
                )}

                {/* 内容部分 */}
                <div className="p-5 flex flex-col flex-grow">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-block py-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 rounded-full">
                      {formatDate(post.createdAt)}
                    </span>
                    {post.category?.name ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-50 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-300">
                        {post.category.name}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white line-clamp-2">
                    <Link
                      href={`posts/${post.slug}`}
                      className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h2>

                  <div className="overflow-x-hidden break-words text-sm text-gray-500 dark:text-white/50 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {post.excerpt}
                    </ReactMarkdown>
                  </div>

                  <Link
                    href={`posts/${post.slug}`}
                    className="mt-auto pt-4 inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 text-sm font-medium"
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
