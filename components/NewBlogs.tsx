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

// 月份元组
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// 格式化日期函数
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = monthNames[date.getMonth()] || "-";
  const day = date.getDate() || "-";
  return `${month} ${day}, ${year}`;
};

// Server Component：加载并传递数据
export default function NewBlogs({ posts }: { posts: Post[] }) {
  // 对博客文章按日期排序（最新的在前）
  const sortedPosts = [...posts].sort(
    (a: Post, b: Post) =>
      Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""),
  );
  if (sortedPosts.length === 0) {
    return <Empty description="暂无最新博客"></Empty>;
  }

  return (
    <div className="w-full px-2 sm:px-4">
      {/* 时间轴容器 */}
      <ul className="relative">
        {/* 统一的时间轴线 - 在大屏下偏移，小屏下靠左 */}
        <div className="absolute left-4 md:left-[10.1rem] top-0 bottom-0 w-0.5 bg-[#dceafc]"></div>

        {sortedPosts.map((post: Post) => (
          <li key={`post-${post.slug}`} className="flex flex-col md:flex-row items-start mb-10 group relative">
            {/* 时间和时间轴点容器 */}
            <div className="flex-shrink-0 flex items-center md:items-start mb-2 md:mb-0">
              {/* 时间 - 移动端显示在上方，PC端显示在左侧 */}
              <div className="md:w-40 text-left md:text-right pl-10 md:pl-0 md:pr-6 text-[#5e7698] font-medium">
                <span className="text-sm md:text-base whitespace-nowrap">
                  {formatDate(post.createdAt || "")}
                </span>
              </div>

              {/* 时间轴点 - 确保点始终在轴线上 */}
              <div className="absolute left-4 md:left-[10.1rem] -translate-x-1/2 z-10 top-2 md:top-2">
                <div className="w-3 h-3 border-2 border-blue-400 rounded-full bg-white group-hover:scale-125 transition-transform duration-300"></div>
              </div>
            </div>

            {/* 内容卡片 - 移动端通过 pl-10 避开时间轴线 */}
            <div className="w-full pl-10 md:pl-0 md:ml-12">
              <div className="p-5 sm:p-6 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group-hover:border-blue-100">
                <h2 className="text-lg sm:text-xl font-bold mb-2">
                  <Link
                    href={`/frontend/posts/${post.slug}`}
                    className="text-gray-800 hover:text-blue-600 transition-colors leading-tight"
                  >
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt && (
                  <p className="text-gray-500 text-sm sm:text-base mb-4 line-clamp-3 break-words">
                    {post.excerpt}
                  </p>
                )}
                <Link
                  href={`/frontend/posts/${post.slug}`}
                  className="inline-flex items-center text-blue-500 hover:text-blue-700 transition-colors text-sm font-semibold"
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
