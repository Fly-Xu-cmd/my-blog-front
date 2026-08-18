import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../public/icon/iconfont.css";
import ThemeProvider from "@/components/ThemeProvider";
import Background from "@/components/Background";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "若木的小世界 - 技术博客",
  description:
    "一个专注于前端/后端/AI技术的博客，分享最新的技术趋势、实用的教程和深入的分析，帮助开发者提升技能，解决问题。",
};

// 首屏前应用主题，避免闪烁
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="referrer" content="no-referrer" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased w-full`}
      >
        <ThemeProvider>
          <Background />
          <div className="relative w-full flex flex-col">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
