"use client";
import { type Post } from "@/app/frontend/model";
import { Anchor, Empty, Space, ConfigProvider, Skeleton } from "antd";
import React, { useEffect, useState, useRef } from "react";
import MyEditorPreview from "@/components/MyEditorPreview";
import { motion, AnimatePresence } from "framer-motion";

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type Params = {
  slug: string;
};

interface OutlineItem {
  key: string;
  href: string;
  title: React.ReactNode;
  level: number;
}

const parseMarkdownHeadings = (content: string): OutlineItem[] => {
  if (!content) return [];
  const lines = content.split("\n");
  const headings: OutlineItem[] = [];
  let index = 0;

  lines.forEach((line) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim().replace(/[*_~`]/g, "");
      const id = `anchor-pre-${index}-${title.slice(0, 10).replace(/\s+/g, "-")}`;
      headings.push({
        key: id,
        href: `#${id}`,
        level: level,
        title: (
          <span
            className="truncate block text-sm"
            style={{ paddingLeft: `${(level - 1) * 12}px` }}
            title={title}
          >
            {title}
          </span>
        ),
      });
      index++;
    }
  });
  return headings;
};

export default function PostDetail({ slug }: Params) {
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/posts/${slug}`);
        const { data } = await res.json();

        if (isMounted) {
          if (data) {
            setPost(data);
            setOutline(parseMarkdownHeadings(data.content));
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch post:", error);
        if (isMounted) setLoading(false);
      }
    };
    fetchPost();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!loading && post) {
      const timer = setTimeout(() => {
        const contentDom =
          containerRef.current?.querySelector(".wmde-markdown") ||
          containerRef.current?.querySelector(".markdown-body") ||
          containerRef.current;
        if (contentDom) {
          const headings = contentDom.querySelectorAll(
            "h1, h2, h3, h4, h5, h6",
          );
          headings.forEach((heading, index) => {
            const text = heading.textContent?.trim() || "";
            heading.id = `anchor-pre-${index}-${text.slice(0, 10).replace(/\s+/g, "-")}`;
          });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [loading, post]);

  // 加载状态下的 UI - 强制宽度分配
  if (loading) {
    return (
      <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row gap-8 px-4 py-8 w-full">
        {/* 左侧文章主体骨架屏 - 强制铺满可用宽度 */}
        <div className="w-full lg:flex-1 bg-white p-6 md:p-10 rounded-xl shadow-sm border border-gray-100 min-h-[700px] block">
          <div className="animate-pulse mb-10 w-full block">
            <div className="h-10 bg-gray-100 rounded-md w-3/4 mb-4 min-w-[280px]"></div>
            <div className="h-4 bg-gray-50 rounded-md w-1/4 min-w-[120px]"></div>
          </div>

          <hr className="my-8 border-gray-50 w-full" />

          <div className="w-full space-y-8 block">
            <Skeleton
              active
              title={false}
              paragraph={{ rows: 4, width: "100%" }}
            />
            <div className="animate-pulse space-y-4 w-full block">
              <div className="h-4 bg-gray-50 rounded w-full"></div>
              <div className="h-4 bg-gray-50 rounded w-full"></div>
              <div className="h-4 bg-gray-50 rounded w-11/12"></div>
              <div className="h-4 bg-gray-50 rounded w-10/12"></div>
            </div>
            <Skeleton
              active
              title={false}
              paragraph={{ rows: 6, width: "100%" }}
            />
          </div>
        </div>

        {/* 右侧大纲骨架屏 - 固定宽度 */}
        <div className="hidden lg:block w-72 shrink-0 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <div className="h-6 bg-gray-100 rounded w-1/2 mb-6 animate-pulse"></div>
          <div className="space-y-4 w-full">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-3 bg-gray-50 rounded w-full animate-pulse"
                style={{ opacity: 1 - i * 0.1 }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Empty description="未找到文章" />
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        components: {
          Anchor: { linkPaddingBlock: 4, fontSize: 13 },
        },
      }}
    >
      <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row items-start gap-8 px-4 py-8">
        <motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1 w-full min-w-0 bg-white p-6 md:p-10 rounded-xl shadow-sm border border-gray-100 min-h-[700px]"
        >
          <header className="mb-8 border-b pb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap gap-4 text-gray-500 text-sm">
              <Space split={<span className="text-gray-300">|</span>}>
                <span>分类：{post.category?.name || "未分类"}</span>
                <span>发布于：{formatDate(post.createdAt)}</span>
              </Space>
              {post.tags && post.tags.length > 0 && (
                <div className="flex gap-2">
                  {post.tags.map((tag, idx) => {
                    const tagName = typeof tag === "string" ? tag : tag.tag?.name;
                    if (!tagName) return null;
                    return (
                      <span
                        key={idx}
                        className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-xs"
                      >
                        #{tagName}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </header>

          <div
            ref={containerRef}
            className="prose prose-lg max-w-none text-gray-800 leading-relaxed"
          >
            <MyEditorPreview source={post.content} />
          </div>
        </motion.article>

        <AnimatePresence>
          {outline.length > 0 && (
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="hidden lg:block w-72 shrink-0 sticky top-24 max-h-[calc(100vh-120px)] overflow-hidden flex flex-col"
            >
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
                <div className="flex items-center gap-2 font-bold text-gray-800 mb-4 pb-2 border-b">
                  <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                  文章目录
                </div>
                <div className="overflow-y-auto custom-scrollbar pr-2">
                  <Anchor
                    affix={false}
                    bounds={100}
                    items={outline}
                    targetOffset={80}
                    onClick={(e, link) => {
                      e.preventDefault();
                      const target = document.getElementById(
                        link.href.replace("#", ""),
                      );
                      if (target) {
                        window.scrollTo({
                          top: target.offsetTop - 80,
                          behavior: "smooth",
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </ConfigProvider>
  );
}
