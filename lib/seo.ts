import type { Metadata } from "next";

/** 站点名称（用于标题模板、OG、JSON-LD） */
export const SITE_NAME = "若木的小世界";

/** 站点默认描述（用于首页、OG、JSON-LD） */
export const SITE_DESCRIPTION =
  "一个专注于前端/后端/AI技术的博客，分享最新的技术趋势、实用的教程和深入的分析，帮助开发者提升技能，解决问题。";

/** 站点默认 OG 分享卡片图（无文章封面时的兜底图） */
export const SITE_OG_IMAGE = "/imgs/head-img.jpg";

/**
 * 获取站点对外的正式 URL（用于 canonical、sitemap、OG 链接拼接）
 * 优先读 NEXT_PUBLIC_SITE_URL 环境变量（生产 CI 注入 https://xylxf.xyz），
 * 未设置时回退到正式域名，避免本地构建生成错误链接。
 * @returns 不带末尾斜杠的站点根 URL
 */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://xylxf.xyz").replace(
    /\/+$/,
    "",
  );
}

/**
 * 构建页面的完整绝对 URL（canonical / OG / sitemap 共用）
 * @param path 页面路径（以 / 开头，默认根路径）
 * @returns 完整 URL 字符串
 */
export function absoluteUrl(path: string = "/"): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * 构造带站点后缀的页面 title 文本
 * @param pageName 页面名（如"全部博客"）
 * @returns "页面名 | 若木的小世界" 形式的标题
 */
export function pageTitle(pageName: string): string {
  return `${pageName} | ${SITE_NAME}`;
}

/**
 * 从 Markdown 原文中提取纯文本摘要（用于 meta description）
 * @param content Markdown 原文
 * @param maxLength 最大长度（默认 150 字符）
 * @returns 去除语法符号后的纯文本摘要
 */
export function extractDescription(content: string, maxLength = 150): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, " ") // 去代码块
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接取文字
    .replace(/[#*`_~>\-]+/g, " ") // 去常见 Markdown 符号
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength)}…` : plain;
}

/**
 * 生成文章详情页（post/note）共用的开放图谱与 twitter 卡片元数据
 * @param title 文章标题
 * @param description 摘要描述
 * @param url 页面完整 URL
 * @param cover 文章封面图（可为空）
 */
export function articleOpenGraph(
  title: string,
  description: string,
  url: string,
  cover?: string | null,
): Pick<Metadata, "alternates" | "openGraph" | "twitter"> {
  const images = cover ? [{ url: cover }] : [{ url: SITE_OG_IMAGE }];
  return {
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}
