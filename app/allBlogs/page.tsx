"use client";
import Link from "next/link";
import { posts } from "../../data/posts";

/**
 * 瀑布流式博客展示页面组件
 * 使用CSS Grid实现不规则卡片布局，展示所有博客文章
 */

export default function AllBlogs() {
  // 对博客文章按日期排序（最新的在前）
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // 为模拟瀑布流效果，给每篇文章生成基于id的确定性高度
  // 替换Math.random()，解决hydration不匹配问题
  const postsWithHeight = sortedPosts.map((post) => {
    // 使用确定性方法生成高度，基于文章id和标题长度
    // 这样服务器和客户端渲染时会生成相同的高度
    const hash = post.id * 31 + post.title.length;
    const height = 200 + (hash % 151); // 高度范围仍然保持在200-350px之间
    return {
      ...post,
      height,
    };
  });

  // 格式化日期显示
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className="w-full min-h-screen p-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">博客瀑布流</h1>
          <p className="text-gray-600">探索所有的思想点滴</p>
        </div>

        {/* 瀑布流容器 - 使用CSS Grid实现 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {postsWithHeight.map((post) => (
            <div
              key={post.id + post.title}
              className="rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white border border-gray-100"
              style={{ height: `${post.height}px` }}
            >
              {/* 博客卡片内容 */}
              <div className="h-full p-5 flex flex-col">
                {/* 日期标签 */}
                <div className="mb-2">
                  <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                    {formatDate(post.date)}
                  </span>
                </div>

                {/* 博客标题 */}
                <h2 className="text-xl font-bold mb-3 text-gray-800 line-clamp-2">
                  <Link
                    href={`/posts/${post.id}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {post.title}
                  </Link>
                </h2>

                {/* 博客摘要 */}
                <p className="text-gray-600 flex-grow line-clamp-3 mb-4">
                  {post.excerpt}
                </p>

                {/* 阅读更多链接 */}
                <Link
                  href={`/posts/${post.id}`}
                  className="inline-flex items-center text-blue-500 hover:text-blue-700 text-sm font-medium"
                >
                  阅读更多
                  <svg
                    className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"
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
          ))}
        </div>
      </div>
    </div>
  );
}
