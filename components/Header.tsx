"use client";
import React, { useState } from "react";
import Contact from "@/components/Contact";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Drawer } from "antd";

const NAV_ITEMS = [
  { path: "/frontend", label: "首页", icon: "\ue606" },
  { path: "/frontend/allBlogs", label: "博客", icon: "\ue634" },
  { path: "/frontend/allStatus", label: "动态", icon: "\ue61d" },
  { path: "/frontend/notes", label: "笔记", icon: "\ue612" },
  { path: "/frontend/about", label: "关于我", icon: "\ue63d" },
];

/**
 * 网站顶部导航栏组件
 * 毛玻璃吸顶 + 渐变 active 指示 + 主题切换
 */
export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isActive = (path: string) =>
    path === "/frontend" ? pathname === "/frontend" : pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-[9999] w-full border-b border-gray-200/60 bg-white/75 backdrop-blur-xl dark:border-white/10 dark:bg-[#05060a]/75">
      <div className="flex justify-between px-4 md:px-6 h-16 items-center max-w-7xl mx-auto">
        {/* 标题（无图标） */}
        <Link href="/frontend" className="shrink-0">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            若木的小世界
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex h-full items-center">
          <ul className="flex h-full items-center list-none m-0 p-0 gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.path} className="h-full flex items-center">
                <Link
                  href={item.path}
                  className={`relative flex h-full items-center px-3 text-[15px] font-medium transition-colors ${
                    isActive(item.path)
                      ? "text-cyan-600 dark:text-cyan-400"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                  {isActive(item.path) && (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* 右侧：主题切换 + 联系方式 + 移动菜单 */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden md:block">
            <Contact />
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex items-center text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2 py-1">
            <span className="w-1 h-5 bg-gradient-to-b from-cyan-500 to-violet-500 rounded-full" />
            <span className="text-lg font-bold text-gray-800 dark:text-white">
              网站导航
            </span>
          </div>
        }
        placement="right"
        onClose={() => setIsMobileMenuOpen(false)}
        open={isMobileMenuOpen}
        styles={{
          body: { padding: "12px 0" },
          header: {
            borderBottom: "1px solid #f1f5f9",
            padding: "16px 24px",
          },
        }}
        width={280}
      >
        <div className="flex flex-col h-full bg-white dark:bg-[#0a0e1a]">
          <ul className="flex flex-col py-2 px-4 space-y-1 m-0 list-none">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all ${
                    isActive(item.path)
                      ? "bg-cyan-50 text-cyan-600 font-semibold dark:bg-cyan-400/10 dark:text-cyan-400"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <i className="iconfont mr-3 text-lg">{item.icon}</i>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto p-6 border-t border-gray-100 dark:border-white/10">
            <div className="text-xs uppercase tracking-wider mb-4 font-semibold px-2 text-gray-400">
              联系方式
            </div>
            <Contact />
          </div>
        </div>
      </Drawer>
    </header>
  );
}
