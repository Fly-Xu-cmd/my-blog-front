import Link from "next/link";
import { status } from "../../data/status";

/**
 * 所有动态展示页面组件
 * 使用时间线布局展示所有动态内容，按日期倒序排列
 */
export default function AllStatus() {
  // 对动态内容按日期排序（最新的在前）
  const sortedStatus = [...status].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  /**
   * 计算天干地支纪年
   * @param year 公历年份
   * @returns 干支纪年字符串
   */
  const getChineseZodiacYear = (year: number): string => {
    const heavenlyStems = [
      "甲",
      "乙",
      "丙",
      "丁",
      "戊",
      "己",
      "庚",
      "辛",
      "壬",
      "癸",
    ];
    const earthlyBranches = [
      "子",
      "丑",
      "寅",
      "卯",
      "辰",
      "巳",
      "午",
      "未",
      "申",
      "酉",
      "戌",
      "亥",
    ];

    // 正确计算：以公元4年为甲子年，需要使用正确的偏移计算
    // 修正索引计算方式，确保结果正确
    const stemIndex = (year - 4) % 10;
    const branchIndex = (year - 4) % 12;

    // 处理负数取模的情况
    const adjustedStemIndex = stemIndex >= 0 ? stemIndex : stemIndex + 10;
    const adjustedBranchIndex =
      branchIndex >= 0 ? branchIndex : branchIndex + 12;

    return (
      heavenlyStems[adjustedStemIndex] +
      earthlyBranches[adjustedBranchIndex] +
      "年"
    );
  };

  // 格式化日期显示（包含干支纪年）
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    console.log(year);
    const chineseZodiac = getChineseZodiacYear(year);
    return `${year}年${
      date.getMonth() + 1
    }月${date.getDate()}日 (${chineseZodiac})`;
  };

  // 格式化日期，仅显示月和日
  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // 获取月份对应的中文名称
  const getChineseMonth = (dateString: string) => {
    const date = new Date(dateString);
    const months = [
      "一月",
      "二月",
      "三月",
      "四月",
      "五月",
      "六月",
      "七月",
      "八月",
      "九月",
      "十月",
      "十一月",
      "十二月",
    ];
    return months[date.getMonth()];
  };

  // 获取带干支纪年的年份显示
  const getYearWithZodiac = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const chineseZodiac = getChineseZodiacYear(year);
    return `${year}年 (${chineseZodiac})`;
  };

  return (
    <div className="w-full min-h-screen p-6 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-16 pt-8">
          <h1 className="text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            所有动态
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            记录生活中的每一个精彩瞬间，分享思想的每一次闪光
          </p>
        </div>

        {/* 时间线容器 */}
        <div className="relative pl-8 md:pl-16 space-y-12">
          {sortedStatus.map((item, index) => (
            <div key={item.id} className="relative group">
              {/* 日期标签 - 仅在移动设备上显示 */}
              <div className="md:hidden absolute -left-24 mt-0.5 whitespace-nowrap">
                <span className="text-xs font-semibold text-gray-500">
                  {formatShortDate(item.date)}
                </span>
              </div>

              {/* 日期标签 - 仅在桌面设备上显示 */}
              <div className="hidden md:block absolute -left-36 top-0 w-28 text-right">
                <div className="text-sm font-bold text-gray-700">
                  {getChineseMonth(item.date)}
                </div>
                <div className="text-xs font-semibold text-gray-500">
                  {formatShortDate(item.date)}
                </div>
                <div className="text-xs font-semibold text-gray-400 mt-1">
                  {getChineseZodiacYear(new Date(item.date).getFullYear())}
                </div>
              </div>

              {/* 动态内容卡片 */}
              <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-xl">
                {/* 动态标题 */}
                <h2 className="text-2xl font-bold mb-3 text-gray-800">
                  <Link
                    href={`/status/${item.id}`}
                    className="inline-block bg-gradient-to-r from-blue-600 to-blue-600 bg-[length:0px_2px] bg-left-bottom bg-no-repeat hover:bg-[length:100%_2px] transition-all duration-300"
                  >
                    {item.title}
                  </Link>
                </h2>

                {/* 动态日期 - 仅在移动设备上显示 */}
                <div className="md:hidden mb-3">
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                    {formatDate(item.date)}
                  </span>
                </div>

                {/* 动态日期 - 仅在桌面设备上显示 */}
                <div className="hidden md:block mb-3">
                  <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-full">
                    {getYearWithZodiac(item.date)}
                  </span>
                </div>

                {/* 动态摘要 */}
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {item.excerpt}
                </p>

                {/* 阅读更多链接 */}
                <div className="flex justify-end">
                  <Link
                    href={`/status/${item.id}`}
                    className="inline-flex items-center text-blue-500 hover:text-blue-700 text-sm font-medium group"
                  >
                    查看详情
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
            </div>
          ))}
        </div>

        {/* 返回首页按钮 */}
        <div className="mt-16 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300"
          >
            返回首页
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
