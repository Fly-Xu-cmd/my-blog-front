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

export default function NewStatus({ status }: { status: Dynamic[] }) {
  // 对动态按日期排序（最新的在前）
  const sortedStatus = [...status].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
  if (sortedStatus.length === 0) {
    return <Empty description="暂无最新动态"></Empty>;
  }

  return (
    <div className="w-full">
      {/* 动态列表 */}
      <ul className="space-y-6">
        {sortedStatus.map((status) => (
          <li
            key={`status-${status.id}`}
            className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
          >
            {/* 动态头部 */}
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">
                  <Link
                    href={`/frontend/status/${status.id}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {status.title}
                  </Link>
                </h3>
                <span className="text-sm text-gray-500">
                  {formatDate(status.createdAt)}
                </span>
              </div>
            </div>

            {/* 动态内容 */}
            <div className="p-4">
              <p className="text-gray-600 mb-3">{status.excerpt}</p>
              <Link
                href={`/frontend/status/${status.id}`}
                className="inline-flex items-center text-blue-500 hover:text-blue-700 transition-colors text-sm font-medium"
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

      {/* 查看全部按钮 */}
      {sortedStatus.length > 0 && (
        <div className="text-center mt-8">
          <Link
            href="/frontend/allStatus"
            className="inline-block px-6 py-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            查看全部动态
          </Link>
        </div>
      )}
    </div>
  );
}
