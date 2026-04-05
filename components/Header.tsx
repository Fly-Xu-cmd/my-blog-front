"use client";
import React, { useState } from "react";
import Contact from "@/components/Contact";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Drawer } from "antd";

/**
 * 网站顶部导航栏组件
 * 包含柔和渐变背景和固定定位功能
 */
export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isActive = (path: string) => pathname === path;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-[9999] w-full">
      <div className="flex justify-between px-6 h-20 items-center bg-white shadow-sm relative z-50">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">若木的小世界</h1>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={toggleMobileMenu}
            className="text-gray-700 hover:text-gray-900 focus:outline-none"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex h-full">
          <ul className="flex space-x-4 h-full items-center list-none m-0 p-0">
            <li
              className={`h-full px-2 flex items-center ${
                isActive("/") ? "active" : ""
              } text-lg font-medium mr-5 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer`}
            >
              <Link href="/" className="flex h-full items-center">
                首页
              </Link>
            </li>
            <li
              className={`h-full px-2 flex items-center ${
                isActive("/frontend/allBlogs") ? "active" : ""
              } text-lg font-medium mr-5 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer`}
            >
              <Link
                href="/frontend/allBlogs"
                className="flex h-full items-center"
              >
                博客
              </Link>
            </li>
            <li
              className={`h-full px-2 flex items-center ${
                isActive("/frontend/allStatus") ? "active" : ""
              } text-lg font-medium mr-5 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer`}
            >
              <Link
                href="/frontend/allStatus"
                className="flex h-full items-center"
              >
                动态
              </Link>
            </li>
            <li
              className={`h-full px-2 flex items-center ${
                isActive("/frontend/notes") ? "active" : ""
              } text-lg font-medium mr-5 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer`}
            >
              <Link
                href="/frontend/notes"
                className="flex h-full items-center"
              >
                笔记
              </Link>
            </li>
            <li
              className={`h-full px-2 flex items-center ${
                isActive("/frontend/about") ? "active" : ""
              } text-lg font-medium text-gray-700 hover:text-gray-900 transition-colors cursor-pointer`}
            >
              <Link href="/frontend/about" className="flex h-full items-center">
                关于我
              </Link>
            </li>
          </ul>
        </div>
        
        {/* Desktop Contact */}
        <div className="hidden md:block">
          <Contact />
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2 py-1">
            <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
            <span className="text-xl font-bold text-gray-800">网站导航</span>
          </div>
        }
        placement="right"
        onClose={closeMobileMenu}
        open={isMobileMenuOpen}
        styles={{ 
          body: { padding: '12px 0' },
          header: { borderBottom: '1px solid #f8fafc', padding: '16px 24px' }
        }}
        width={280}
        className="md:hidden"
      >
        <div className="flex flex-col h-full bg-white">
          <ul className="flex flex-col py-2 px-4 space-y-1 m-0 list-none">
            <li>
              <Link
                href="/"
                className={`flex items-center px-4 py-3 rounded-xl transition-all ${
                  isActive("/") 
                    ? "bg-blue-50 text-blue-600 font-bold" 
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={closeMobileMenu}
              >
                <i className="iconfont mr-3 text-lg">&#xe606;</i>
                首页
              </Link>
            </li>
            <li>
              <Link
                href="/frontend/allBlogs"
                className={`flex items-center px-4 py-3 rounded-xl transition-all ${
                  isActive("/frontend/allBlogs") 
                    ? "bg-blue-50 text-blue-600 font-bold" 
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={closeMobileMenu}
              >
                <i className="iconfont mr-3 text-lg">&#xe634;</i>
                博客
              </Link>
            </li>
            <li>
              <Link
                href="/frontend/allStatus"
                className={`flex items-center px-4 py-3 rounded-xl transition-all ${
                  isActive("/frontend/allStatus") 
                    ? "bg-blue-50 text-blue-600 font-bold" 
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={closeMobileMenu}
              >
                <i className="iconfont mr-3 text-lg">&#xe61d;</i>
                动态
              </Link>
            </li>
            <li>
              <Link
                href="/frontend/notes"
                className={`flex items-center px-4 py-3 rounded-xl transition-all ${
                  isActive("/frontend/notes") 
                    ? "bg-blue-50 text-blue-600 font-bold" 
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={closeMobileMenu}
              >
                <i className="iconfont mr-3 text-lg">&#xe612;</i>
                笔记
              </Link>
            </li>
            <li>
              <Link
                href="/frontend/about"
                className={`flex items-center px-4 py-3 rounded-xl transition-all ${
                  isActive("/frontend/about") 
                    ? "bg-blue-50 text-blue-600 font-bold" 
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={closeMobileMenu}
              >
                <i className="iconfont mr-3 text-lg">&#xe63d;</i>
                关于我
              </Link>
            </li>
          </ul>
          <div className="mt-auto p-6 bg-gray-50/50 border-t border-gray-100">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-4 font-semibold px-2">
              联系方式
            </div>
            <Contact />
          </div>
        </div>
      </Drawer>
    </header>
  );
}
