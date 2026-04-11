import React, { useState, useRef, useEffect } from "react";
import MyEditorPreview from "@/components/MyEditorPreview";
import { Dynamic } from "@/app/frontend/model";

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
  const stemIndex = (year - 4) % 10;
  const branchIndex = (year - 4) % 12;

  // 处理负数取模的情况
  const adjustedStemIndex = stemIndex >= 0 ? stemIndex : stemIndex + 10;
  const adjustedBranchIndex = branchIndex >= 0 ? branchIndex : branchIndex + 12;

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

export default function Dynamics({ dynamic }: { dynamic: Dynamic }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 检测内容是否超过截断高度
    const checkContentHeight = () => {
      if (measureRef.current) {
        const isOverflowing = measureRef.current.scrollHeight > 300;
        setNeedsTruncation(isOverflowing);
      }
    };

    // 延迟检查，确保内容已渲染
    const timer = setTimeout(checkContentHeight, 100);
    return () => clearTimeout(timer);
  }, [dynamic.content]);

  return (
    <div className="flex items-start w-full group relative">
      {/* 日期 - 在大屏下独立显示，小屏下隐藏 */}
      <div className="hidden md:flex flex-col items-center w-24 flex-shrink-0 mr-8 pt-2">
        <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">
          {getChineseMonth(dynamic.createdAt)}
        </div>
        <div className="text-3xl font-black text-gray-900 mb-1 leading-none">
          {new Date(dynamic.createdAt).getDate()}
        </div>
        <div className="text-[10px] text-gray-400 font-medium">
          {new Date(dynamic.createdAt).getFullYear()}
        </div>
      </div>

      {/* 动态内容主体 */}
      <div className="flex-1 min-w-0 relative bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 p-5 sm:p-10 transition-all duration-500 hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:border-blue-100 overflow-hidden">
        <header className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-3 group-hover:text-blue-600 transition-colors break-words">
            {dynamic.title || "记录此时此刻"}
          </h2>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-500 rounded-full border border-gray-100 font-medium">
              <i className="iconfont text-xs">&#xe606;</i>
              {formatDate(dynamic.createdAt)}
            </div>
          </div>
        </header>

        {/* 动态内容容器 - 限制高度以实现截断效果 */}
        <div
          ref={contentRef}
          className={`relative transition-all duration-700 ease-in-out overflow-hidden ${
            isExpanded ? "max-h-[5000px]" : "max-h-[300px]"
          }`}
        >
          <div className="text-gray-700 leading-relaxed text-base sm:text-lg">
            <MyEditorPreview source={dynamic.content || "暂无详情..."} />
          </div>

          {/* 底部渐变 - 仅在未展开且内容超过限制时显示 */}
          {!isExpanded && needsTruncation && (
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none transition-opacity duration-500"></div>
          )}
        </div>

        {/* 隐藏的测量容器 - 用于检测内容是否需要截断 */}
        <div
          ref={measureRef}
          className="absolute invisible"
          style={{ visibility: "hidden", pointerEvents: "none" }}
        >
          <div className="text-gray-700 leading-relaxed text-base sm:text-lg">
            <MyEditorPreview source={dynamic.content || "暂无详情..."} />
          </div>
        </div>

        {/* 展示更多 / 收起内容 交互按钮 - 仅在内容需要截断时显示 */}
        {needsTruncation && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="group/btn relative px-8 py-3 bg-blue-50 text-blue-600 rounded-full font-bold text-sm transition-all duration-300 hover:bg-blue-600 hover:text-white hover:shadow-[0_10px_20px_rgba(59,130,246,0.2)] focus:outline-none overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isExpanded ? (
                  <>
                    收起内容
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </>
                ) : (
                  <>
                    展示更多
                    <svg
                      className="w-4 h-4 animate-bounce"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
