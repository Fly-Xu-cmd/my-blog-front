"use client";
import { useState } from "react";
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
  // 修正索引计算方式，确保结果正确
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
  const [isDetail, setIsDetail] = useState(false);
  const toggleDetail = () => {
    setIsDetail(!isDetail);
  };

  return (
    <>
      <div className="flex items-start w-full">
        {/* 日期 */}
        <div className="w-16 whitespace-nowrap mr-4 pt-2">
          <div className="text-sm text-gray-500">
            {getChineseMonth(dynamic.createdAt)}
          </div>
          <div className="text-sm text-gray-500">
            {formatShortDate(dynamic.createdAt)}
          </div>
        </div>
        {/* 动态内容 */}
        <div className="flex-1 overflow-hidden bg-white cursor-pointer rounded-xl shadow-lg p-6 transform transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-xl">
          {/* 动态标题 */}
          <h2 className="text-2xl font-bold mb-3 text-gray-800">
            {dynamic.title || "暂无标题"}
          </h2>

          {/* 动态日期 - 仅在移动设备上显示 */}
          <div className="md:hidden mb-3">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
              {formatDate(dynamic.createdAt)}
            </span>
          </div>

          {/* 动态日期 - 仅在桌面设备上显示 */}

          <div className="hidden md:block mb-3">
            <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-full">
              {getYearWithZodiac(dynamic.createdAt)}
            </span>
          </div>

          {/* 动态摘要 */}
          <p className="text-gray-600 mb-4 leading-relaxed">
            {dynamic.excerpt || "暂无简介"}
          </p>

          {/* 动态内容 */}
          <div className="text-gray-700 leading-relaxed overflow-hidden ">
            <MyEditorPreview source={dynamic.content || "暂无内容"} />
          </div>
        </div>
      </div>
    </>
  );
}
