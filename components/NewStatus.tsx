import { Empty } from "antd";
import Link from "next/link";

// 定义动态类型
type Dynamic = {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  createdAt: string;
};

// 格式化日期函数
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}年${month}月${day}日`;
};

export default function NewStatus({ status }: { status: Dynamic[] }) {
  const sortedStatus = [...status].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  if (sortedStatus.length === 0) {
    return <Empty description="暂无最新动态" />;
  }

  return (
    <div className="w-full">
      <ul className="space-y-6">
        {sortedStatus.map((status) => (
          <li
            key={`status-${status.id}`}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg dark:bg-white/[0.04] dark:border-white/10 dark:backdrop-blur-xl hover:border-cyan-200 dark:hover:border-cyan-400/40 dark:hover:shadow-[0_0_40px_rgba(34,211,238,0.12)] transition-all duration-300 overflow-hidden"
          >
            {/* 动态头部 */}
            <div className="px-5 py-4 border-b border-gray-50 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.02] flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                <Link
                  href={`/frontend/status/${status.id}`}
                  className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  {status.title}
                </Link>
              </h3>
              <span className="text-xs text-gray-400 dark:text-white/30 whitespace-nowrap ml-3">
                {formatDate(status.createdAt)}
              </span>
            </div>

            {/* 动态内容 */}
            <div className="px-5 py-4">
              <p className="text-gray-600 dark:text-white/60 mb-3 line-clamp-3 text-sm leading-relaxed">
                {status.excerpt}
              </p>
              <Link
                href={`/frontend/status/${status.id}`}
                className="inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition-colors text-sm font-medium"
              >
                查看详情
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {sortedStatus.length > 0 && (
        <div className="text-center mt-8">
          <Link
            href="/frontend/allStatus"
            className="inline-block px-6 py-2.5 rounded-full bg-cyan-50 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-400/20 transition-colors text-sm font-medium"
          >
            查看全部动态
          </Link>
        </div>
      )}
    </div>
  );
}
