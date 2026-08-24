import Link from "next/link";
import type { Metadata } from "next";

/**
 * 404 页面元数据
 */
export const metadata: Metadata = {
  title: "页面未找到",
  description: "抱歉，您访问的页面不存在",
  robots: { index: false, follow: false },
};

/**
 * 全局 404 未找到页面
 * 提供友好的错误提示和返回首页/导航链接
 */
export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20">
      <div className="text-center">
        {/* 404 数字 */}
        <h1 className="text-8xl md:text-9xl font-black bg-gradient-to-r from-cyan-500 to-violet-500 bg-clip-text text-transparent mb-4">
          404
        </h1>

        {/* 错误信息 */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
          页面走丢了
        </h2>
        <p className="text-gray-500 dark:text-white/50 mb-8 max-w-md mx-auto">
          抱歉，您访问的页面不存在或已被移除。可能是链接输入错误，或者该内容已被作者删除。
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 hover:-translate-y-0.5"
          >
            返回首页
          </Link>
          <Link
            href="/allBlogs"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white/70 font-semibold hover:bg-gray-200 dark:hover:bg-white/20 transition-all duration-300"
          >
            浏览博客
          </Link>
        </div>
      </div>
    </div>
  );
}
