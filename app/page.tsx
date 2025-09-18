import Link from "next/link";
import { posts } from "../data/posts";

/**
 * 博客首页组件
 * 展示博客文章列表，采用时间轴样式
 */
export default function Home() {
  // 对博客文章按日期排序（最新的在前）
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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

  return (
    <div className="w-full h-full p-6 bg-white h-screen">
      <div className="flex items-center justify-center">
        <h1 className="text-3xl font-bold mb-10 text-center">探索思想的</h1>
        <h1 className="text-3xl font-bold mb-10 text-center !text-[#00b8ff]">
          无限可能
        </h1>
      </div>
      <p className="text-center text-gray-600 mb-10">
        分享我在技术、生活和思考中的洞见、记录成长的每一步。这里是我的数字花园，欢迎驻足。
      </p>

      {/* 时间轴容器 */}
      <div className="relative max-w-6xl mx-auto">
        {/* 时间轴 */}
        <div className="h-full w-0.5 bg-[#dceafc] absolute top-0 left-31.5 "></div>
        <ul className="space-y-8">
          {sortedPosts.map((post, index) => (
            <li key={post.id} className="relative flex items-start ">
              {/* 时间 */}
              <div className="w-10 !h-full flex items-top justify-end text-nowrap text-[#5e7698]  ">
                <span className="text-base ">{`${
                  monthNames[Number(post.date.split("-")[1]) - 1]
                } ${post.date.split("-")[2]}, ${
                  post.date.split("-")[0]
                }`}</span>
              </div>
              {/* 时间轴点 */}
              <div className="w-3.5 h-3 border-2 border-[#dceafc] rounded-full bg-white mx-20"></div>

              {/* 内容卡片 */}
              <div className="w-full ml-8 p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200">
                <h2 className="text-xl font-semibold mb-2">
                  <Link
                    href={`/posts/${post.id}`}
                    className="text-gray-800 hover:text-blue-600 transition-colors"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <Link
                  href={`/posts/${post.id}`}
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
    </div>
  );
}
