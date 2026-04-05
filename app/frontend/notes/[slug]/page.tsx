"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type Note } from "@/app/frontend/model";
import { Calendar, Tag, ChevronLeft, FolderOpen, Clock } from "lucide-react";

// 获取单篇笔记
const fetchNote = async (slug: string) => {
  const res = await fetch(`/api/notes/${slug}`);
  return res.json();
};

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetchNote(slug).then((data) => {
      if (data.ok) {
        setNote(data.data);
      } else {
        setError(data.error || "无法加载笔记内容");
      }
      setLoading(false);
    });
  }, [slug]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-gray-400 text-sm">正在加载中...</span>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 text-center max-w-md w-full">
          <div className="text-red-400 mb-4 text-5xl">!</div>
          <h1 className="text-2xl font-bold mb-2 text-gray-800">未找到相关内容</h1>
          <p className="text-gray-500 mb-8">{error || "该笔记可能已被移除或地址有误"}</p>
          <button 
            onClick={() => router.push('/frontend/notes')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-2xl transition-all shadow-lg shadow-blue-100"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white text-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* 顶部导航 */}
        <nav className="mb-10">
          <Link 
            href="/frontend/notes"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-600 transition-colors font-medium"
          >
            <ChevronLeft size={20} />
            <span>返回笔记列表</span>
          </Link>
        </nav>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* 文章头部 */}
          <header className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-8 text-gray-900 leading-tight">
              {note.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-300" />
                <span>最后修改：{formatDate(note.updatedAt)}</span>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                {note.category && (
                  <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
                    <FolderOpen size={14} />
                    {note.category.name}
                  </div>
                )}
                {(note.tags as string[])?.map((tag) => (
                  <span 
                    key={tag} 
                    className="flex items-center gap-1 bg-gray-50 text-gray-500 px-3 py-1 rounded-full text-xs border border-gray-100"
                  >
                    <Tag size={12} />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </header>

          <hr className="mb-12 border-gray-100" />

          {/* 内容展示 */}
          <div className="prose prose-blue max-w-none 
                          prose-headings:font-bold prose-headings:text-gray-800
                          prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-6
                          prose-a:text-blue-600 prose-a:underline-offset-4 hover:prose-a:text-blue-700
                          prose-strong:text-gray-900 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50/30 prose-blockquote:py-1 prose-blockquote:rounded-r-lg
                          prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                          prose-pre:bg-gray-900 prose-pre:rounded-2xl prose-pre:shadow-xl
                          prose-img:rounded-3xl prose-img:shadow-lg prose-li:text-gray-700"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {note.content}
            </ReactMarkdown>
          </div>
          
          <div className="mt-20 pt-10 border-t border-gray-50 flex justify-center">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-gray-300 hover:text-blue-500 transition-colors flex flex-col items-center gap-2"
            >
              <div className="p-3 rounded-full border border-gray-100 hover:border-blue-100 hover:bg-blue-50 transition-all">
                <ChevronLeft className="rotate-90" />
              </div>
              <span className="text-xs font-medium uppercase tracking-widest">回到顶部</span>
            </button>
          </div>
        </motion.article>
      </div>
    </div>
  );
}
