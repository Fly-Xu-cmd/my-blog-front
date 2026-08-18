"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * 联系组件：微信/QQ 二维码 + GitHub 链接
 */
export default function Contact() {
  const [showQRCode, setShowQRCode] = useState(false);
  const [imgSrc, setImgSrc] = useState("/imgs/wechat-qrcode.jpg");

  const handleClick = (src: string) => {
    setImgSrc(src || "/imgs/wechat-qrcode.jpg");
    setShowQRCode(true);
  };

  return (
    <div className="relative">
      <ul className="flex items-center justify-center">
        <li
          className="group relative w-9 h-9 flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
          onClick={() => handleClick("/imgs/wechat-qrcode.jpg")}
        >
          <i className="iconfont !text-[26px] text-green-600 dark:text-green-400 hover:scale-110 transition-transform">
            &#xe600;
          </i>
          <span className="absolute bottom-[-100%] mb-1 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-none">
            微信二维码
          </span>
        </li>
        <li
          className="group relative w-9 h-9 flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
          onClick={() => handleClick("/imgs/qq-qrcode.jpg")}
        >
          <i className="iconfont !text-[26px] text-brand-500 hover:scale-110 transition-transform">
            &#xe882;
          </i>
          <span className="absolute bottom-[-100%] mb-1 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-none">
            QQ 二维码
          </span>
        </li>
        <li className="relative w-9 h-9 flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
          <i className="iconfont !text-[26px] text-gray-800 dark:text-gray-200 hover:scale-110 transition-transform">
            &#xe885;
          </i>
          <Link
            className="absolute w-full h-full"
            href={"https://github.com/Fly-Xu-cmd"}
            target="_blank"
            aria-label="GitHub"
          />
        </li>
      </ul>

      {/* 二维码展示框 */}
      {showQRCode && (
        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#0a0e1a] p-4 rounded-xl shadow-xl border border-gray-100 dark:border-white/10 z-20 animate-fadeIn flex flex-col items-center w-56">
          <div className="w-44 h-44 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-2">
            <Image
              src={imgSrc}
              alt="二维码"
              className="max-w-full max-h-full"
              width={500}
              height={500}
            />
          </div>
          <p className="text-sm text-center text-gray-600 dark:text-gray-300">
            扫码添加{imgSrc.includes("wechat") ? "微信" : "QQ"}
          </p>
          <button
            className="absolute -top-3 -right-3 bg-white dark:bg-[#0a0e1a] rounded-full w-6 h-6 flex items-center justify-center text-gray-500 border border-gray-200 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/10"
            onClick={() => setShowQRCode(false)}
            aria-label="关闭"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      {/* 点击空白处关闭二维码的遮罩层 */}
      {showQRCode && (
        <div
          className="fixed inset-0 bg-transparent z-10"
          onClick={() => setShowQRCode(false)}
        />
      )}
    </div>
  );
}
