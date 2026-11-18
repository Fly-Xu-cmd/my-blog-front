import { safeJson } from '@/lib/markdown';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import '../public/icon/iconfont.css';
import ThemeProvider from '@/components/ThemeProvider';
import AntdStyleRegistry from '@/components/AntdStyleRegistry';
import Background from '@/components/Background';
import Header from '@/components/Header';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import Footer from '@/components/Footer';
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE, absoluteUrl } from '@/lib/seo';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  title: {
    default: `${SITE_NAME} - 技术博客`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ['前端开发', '后端开发', 'AI', '技术博客', 'JavaScript', 'React', 'Next.js'],
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    title: `${SITE_NAME} - 技术博客`,
    description: SITE_DESCRIPTION,
    url: absoluteUrl('/'),
    siteName: SITE_NAME,
    locale: 'zh_CN',
    type: 'website',
    images: [{ url: SITE_OG_IMAGE, width: 1070, height: 1070, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - 技术博客`,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

/** WebSite 结构化数据：帮助搜索引擎识别站点名称与首页链接 */
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: absoluteUrl(),
  description: SITE_DESCRIPTION,
  inLanguage: 'zh-CN',
};

// 首屏前应用主题，避免闪烁
const themeInitScript = `(function(){var t='system';try{var s=localStorage.getItem('theme');if(s==='light'||s==='dark'||s==='system')t=s}catch(e){}var r=document.documentElement;r.dataset.themePreference=t;r.classList.toggle('dark',t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches))})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="referrer" content="no-referrer" />
        <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} RSS`} href="/feed.xml" />
        <meta name="baidu-site-verification" content="codeva-4lXFAVteOq" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased w-full`}>
        <AntdStyleRegistry>
          <ThemeProvider>
            <Background />
            <AnalyticsTracker />
            <div className="relative w-full flex flex-col min-h-screen">
              <Header />
              <div className="w-full flex flex-1">{children}</div>
              <Footer />
            </div>
            {/* WebSite 结构化数据（JSON-LD） */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: safeJson(websiteJsonLd) }}
            />
          </ThemeProvider>
        </AntdStyleRegistry>
      </body>
    </html>
  );
}
