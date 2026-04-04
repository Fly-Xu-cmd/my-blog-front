"use client";
import { type Post } from "@/app/frontend/model";
import { Anchor, Empty, Space, Spin, Tooltip, ConfigProvider } from "antd";
import React, { useEffect, useState, useRef } from "react";
import MyEditorPreview from "@/components/MyEditorPreview";

// 格式化日期
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

export default function PostDetail({ slug }: Params) {
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. 获取数据
  useEffect(() => {
    let isMounted = true;
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/posts/${slug}`);
        const { data } = await res.json();
        if (isMounted) {
          setPost(data);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch post:", error);
        if (isMounted) setLoading(false);
      }
    };
    fetchPost();
    return () => { isMounted = false; };
  }, [slug]);

  // 2. 提取大纲逻辑
  useEffect(() => {
    if (!loading && post) {
      const timer = setTimeout(() => {
        // 尝试匹配 markdown 容器
        const contentDom = containerRef.current?.querySelector(".wmde-markdown") || 
                          containerRef.current?.querySelector(".markdown-body") ||
                          containerRef.current;
        
        if (!contentDom) return;

        const headings = contentDom.querySelectorAll("h1, h2, h3, h4, h5, h6");
        const newOutline: OutlineItem[] = [];

        headings.forEach((heading, index) => {
          // 确保每个标题都有 ID 用于锚点跳转
          if (!heading.id) {
            const text = heading.textContent?.trim() || "";
            heading.id = `anchor-${index}-${text.slice(0, 10).replace(/\s+/g, '-')}`;
          }

          const level = parseInt(heading.tagName.replace("H", ""), 10);
          newOutline.push({
            key: heading.id,
            href: `#${heading.id}`,
            level: level,
            title: (
              <span 
                className="truncate block text-sm" 
                style={{ paddingLeft: `${(level - 1) * 12}px` }}
                title={heading.textContent || ""}
              >
                {heading.textContent}
              </span>
            ),
          });
        });
        setOutline(newOutline);
      }, 500); // 略微延时确保渲染完成
      return () => clearTimeout(timer);
    }
  }, [loading, post]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spin size="large" tip="加载中..." />
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
          Anchor: {
            linkPaddingBlock: 4,
            fontSize: 13,
          },
        },
      }}
    >
      <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row items-start gap-8 px-4 py-8">
        {/* 左侧：文章主体 */}
        <article className="flex-1 w-full min-w-0 bg-white p-6 md:p-10 rounded-xl shadow-sm border border-gray-100">
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
                  {post.tags.map((tagPost, idx) => (
                    tagPost.tag && (
                      <span key={idx} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-xs">
                        #{tagPost.tag.name}
                      </span>
                    )
                  ))}
                </div>
              )}
            </div>
          </header>

          <div ref={containerRef} className="prose prose-lg max-w-none text-gray-800 leading-relaxed">
            <MyEditorPreview source={post.content} />
          </div>
        </article>

        {/* 右侧：大纲导航 */}
        {outline.length > 0 && (
          <aside className="hidden lg:block w-72 shrink-0 sticky top-24 max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
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
                    const target = document.getElementById(link.href.replace('#', ''));
                    if (target) {
                      window.scrollTo({
                        top: target.offsetTop - 80,
                        behavior: "smooth"
                      });
                    }
                  }}
                />
              </div>
            </div>
          </aside>
        )}
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
