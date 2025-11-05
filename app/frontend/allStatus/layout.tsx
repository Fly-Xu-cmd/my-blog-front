import { ReactNode } from "react";

/**
 * 所有动态展示页面组件
 * 使用时间线布局展示所有动态内容，按日期倒序排列
 */
export default async function AllStatusLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className=" relative w-full min-h-screen p-6 bg-gradient-to-br from-slate-50 to-gray-100">
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
        {children}
      </div>
    </div>
  );
}
