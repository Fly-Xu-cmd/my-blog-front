"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * 联系组件，包含社交媒体图标，点击微信图标可显示二维码
 */
export default function Contact() {
  // 控制二维码显示状态的状态变量
  const [showQRCode, setShowQRCode] = useState(false);
  const [imgSrc, setImgSrc] = useState("/imgs/wechat-qrcode.jpg");
  // 处理微信图标点击事件
  const handleWechatClick = (src: string) => {
    setShowQRCode(!showQRCode);
    setImgSrc(src || "/imgs/wechat-qrcode.jpg");
  };

  return (
    <div className="relative">
      <ul className="flex items-center justify-center">
        <li
          className="w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-gray-100 rounded-full transition-colors relative z-10"
          onClick={() => handleWechatClick("/imgs/wechat-qrcode.jpg")}
        >
          <i className="iconfont !text-[32px] text-green-600 hover:scale-110 transition-transform">
            &#xe600;
          </i>

          {/* 二维码提示文字 */}
          <span className="absolute bottom-full mb-1 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
            点击显示微信二维码
          </span>
        </li>
        <li
          className="w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-gray-100 rounded-full transition-colors"
          onClick={() => handleWechatClick("/imgs/qq-qrcode.jpg")}
        >
          <i className="iconfont !text-[32px] text-blue-500 hover:scale-110 transition-transform">
            &#xe882;
          </i>

          {/* 二维码提示文字 */}
          <span className="absolute bottom-full mb-1 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
            点击显示QQ二维码
          </span>
        </li>
        <li className="relative w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-gray-100 rounded-full transition-colors">
          <i className="iconfont !text-[32px] text-gray-800 hover:scale-110 transition-transform">
            &#xe885;
          </i>
          <Link
            className="absolute w-full h-full"
            href={"https://github.com/Fly-Xu-cmd"}
            target="_blank"
          />
        </li>
      </ul>

      {/* 二维码展示框 */}
      {showQRCode && (
        <div className="absolute top-full right-0 mt-2 bg-white p-4 rounded-lg shadow-xl border border-gray-100 z-20 animate-fadeIn flex flex-col items-center">
          {/* 这里可以替换为实际的二维码图片 */}
          <div className="w-62 h-62 bg-gray-100 flex items-center justify-center mb-2">
            {/* 模拟二维码图片 - 实际使用时替换为真实的二维码图片 */}
            <Image
              src={imgSrc}
              alt="微信二维码"
              className="max-w-full max-h-full"
              width={500}
              height={500}
              onError={(e) => {
                // 如果图片加载失败，显示默认占位符
                const target = e.target as HTMLImageElement;
                target.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='192' height='192' viewBox='0 0 24 24' fill='none' stroke='%234ade80' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%234ade80' font-size='10'%3E微信二维码%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>
          <p className="text-sm text-center text-gray-600 cursor-pointer">
            扫码添加{imgSrc.includes("wechat") ? "微信" : "QQ"}
          </p>
          {/* 关闭按钮 */}
          <button
            className="absolute -top-3 -right-3 bg-white rounded-full w-6 h-6 flex items-center justify-center text-gray-500 border border-gray-200 hover:bg-gray-50"
            onClick={() => setShowQRCode(false)}
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
