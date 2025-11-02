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
    (a: any, b: any) =>
      Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "")
  );

  return (
    <div className="w-full">
      {/* 时间轴 */}
      <ul>
        {sortedPosts.map((post: Post) => (
          <li key={`post-${post.slug}`} className="flex items-start h-50">
            {/* 时间 */}
            <div className=" !h-full flex items-top justify-end text-nowrap text-[#5e7698] mb-10">
              <span className="text-base ">
                {formatDate(post.createdAt || "")}
              </span>
            </div>

            {/* 时间轴点 */}
            <div className="w-3.5 h-full mx-20 flex justify-center  items-center flex-col">
              <div className="w-3 h-3 border-2 border-[#dceafc] rounded-full bg-white "></div>
              <div className="h-full w-0.5  bg-[#dceafc]  "></div>
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
