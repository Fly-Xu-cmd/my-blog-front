import { Empty } from "antd";
import Link from "next/link";

type Post = {
  id: string;
  title?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  excerpt?: string;
  slug?: string;
  category?: string;
  tags?: string[];
  cover?: string;
};

// 格式化日期函数
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}年${month}月${day}日`;
};

export default function NewBlogs({ posts }: { posts: Post[] }) {
  const sortedPosts = [...posts].sort(
    (a: Post, b: Post) =>
      Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""),
  );
  if (sortedPosts.length === 0) {
    return <Empty description="暂无最新博客" />;
  }

  return (
    <div className="w-full px-2 sm:px-4">
      <ul className="relative">
        {/* 时间轴线 */}
        <div className="absolute left-4 md:left-[10.5rem] top-0 bottom-0 w-px bg-gradient-to-b from-cyan-300 via-gray-200 to-transparent dark:from-cyan-500/50 dark:via-white/10 dark:to-transparent" />

        {sortedPosts.map((post: Post) => (
          <li
            key={`post-${post.slug}`}
            className="flex flex-col md:flex-row items-start mb-8 group relative"
          >
            {/* 时间 */}
            <div className="flex-shrink-0 md:w-40 md:text-right md:pr-6 pl-10 md:pl-0 text-sm font-medium text-gray-500 dark:text-white/40">
              <span className="whitespace-nowrap">
                {formatDate(post.createdAt || "")}
              </span>
            </div>

            {/* 时间轴点 */}
            <div className="absolute left-4 md:left-[10.5rem] -translate-x-1/2 z-10 top-1.5">
              <div className="w-3 h-3 rounded-full bg-white border-2 border-cyan-400 shadow-sm dark:bg-[#05060a] dark:border-cyan-400 group-hover:bg-cyan-500 group-hover:scale-125 group-hover:shadow-[0_0_12px_#22d3ee] transition-all duration-300" />
            </div>

            {/* 内容卡片 */}
            <div className="w-full pl-10 md:pl-0 md:ml-12">
              <div className="p-5 sm:p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg dark:bg-white/[0.04] dark:border-white/10 dark:backdrop-blur-xl hover:border-cyan-200 dark:hover:border-cyan-400/40 dark:hover:shadow-[0_0_40px_rgba(34,211,238,0.12)] transition-all duration-300 group-hover:-translate-y-0.5">
                <h2 className="text-lg sm:text-xl font-bold mb-2">
                  <Link
                    href={`/frontend/posts/${post.slug}`}
                    className="text-gray-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors leading-tight"
                  >
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt && (
                  <p className="text-gray-500 dark:text-white/50 text-sm sm:text-base mb-4 line-clamp-3 break-words">
                    {post.excerpt}
                  </p>
                )}
                <Link
                  href={`/frontend/posts/${post.slug}`}
                  className="inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition-colors text-sm font-semibold"
                >
                  详情阅读
                  <svg
                    className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
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
          </li>
        ))}
      </ul>
    </div>
  );
}
