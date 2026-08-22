import type { Metadata } from "next";
import AllBlogsClient from "./AllBlogsClient";

/**
 * 全部博客页（Server Component 入口，提供独立 SEO 元数据）
 */
export const metadata: Metadata = {
  title: "全部博客",
  description: "浏览若木的小世界的全部技术博客文章，涵盖前端、后端、AI 等领域的实践与思考。",
  alternates: { canonical: "/frontend/allBlogs" },
};

export default function AllBlogsPage() {
  return <AllBlogsClient />;
}
