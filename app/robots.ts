import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * 生成 /robots.txt
 * 允许抓取前台页面，禁止抓取 API 与编辑页，并声明 sitemap 地址
 * @returns robots 规则
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
