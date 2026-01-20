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
  const sortedPosts = posts.sort(
    (a: Post, b: Post) =>
      Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""),
  );
  if (sortedPosts.length === 0) {
    return <Empty description="暂无最新博客"></Empty>;
  }

  return (
    <div className="w-full">
      {/* 时间轴 */}
      <ul className="relative">
        {/* 统一的时间轴线 - 调整位置，确保点在轴上 */}
        <div className="absolute left-[16.7rem] top-0 bottom-0 w-0.5 bg-[#dceafc]"></div>

        {sortedPosts.map((post: Post) => (
          <li key={`post-${post.slug}`} className="flex items-start mb-6">
            {/* 时间和时间轴点容器 - 使用固定宽度确保对齐 */}
            <div className="flex-shrink-0 flex items-start">
              {/* 时间 */}
              <div className="w-48 text-right pr-6 text-[#5e7698]">
                <span className="text-base whitespace-nowrap">
                  {formatDate(post.createdAt || "")}
                </span>
              </div>

              {/* 时间轴点 - 调整位置，确保正好在轴上 */}
              <div className="relative z-10 ml-20 mr-20">
                <div className="absolute -left-2.5 w-3 h-3 border-2 border-[#dceafc] rounded-full bg-white"></div>
              </div>
            </div>

            {/* 内容卡片 */}
            <div className="w-full ml-4 p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200">
              <h2 className="text-xl font-semibold mb-2">
                <Link
                  href={`/frontend/posts/${post.slug}`}
                  className="text-gray-800 hover:text-blue-600 transition-colors"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="text-gray-600 mb-4">{post.excerpt}</p>
              <Link
                href={`/frontend/posts/${post.slug}`}
                className="inline-flex items-center text-blue-500 hover:text-blue-700 transition-colors text-sm font-medium"
              >
                阅读更多
                <svg
                  className="w-4 h-4 ml-1"
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
          </li>
        ))}
      </ul>
    </div>
  );
}
