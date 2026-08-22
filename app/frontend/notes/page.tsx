import type { Metadata } from "next";
import NotesClient from "./NotesClient";

/**
 * 笔记列表页（Server Component 入口，提供独立 SEO 元数据）
 */
export const metadata: Metadata = {
  title: "笔记",
  description: "若木的学习笔记库：按分类与标签整理的前端、后端、AI 技术笔记，支持搜索筛选。",
  alternates: { canonical: "/frontend/notes" },
};

export default function NotesPage() {
  return <NotesClient />;
}
