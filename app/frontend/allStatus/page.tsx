import type { Metadata } from "next";
import AllStatusClient from "./AllStatusClient";

/**
 * 全部动态页（Server Component 入口，提供独立 SEO 元数据）
 */
export const metadata: Metadata = {
  title: "全部动态",
  description: "查看若木的小世界的全部动态，记录日常的技术碎碎念与生活点滴。",
  alternates: { canonical: "/frontend/allStatus" },
};

export default function AllStatusPage() {
  return <AllStatusClient />;
}
