"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { type Note } from "@/app/frontend/model";
import { Calendar, Tag, ChevronRight } from "lucide-react";

// 获取所有笔记
const fetchAllNotes = async () => {
  const res = await fetch("/api/notes?published=true");
  return res.json();
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllNotes().then((data) => {
      if (data.ok) {
        setNotes(data.data);
      }
      setLoading(false);
    });
  }, []);

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-indigo-50/50 via-white to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent"
          >
            随心笔记
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500"
          >
            记录灵感点滴，沉淀知识碎片
          </motion.p>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="flex space-x-2 items-center text-gray-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              <span className="ml-2 text-sm">正在加载内容...</span>
            </div>
          </div>
        )}

        {/* 笔记列表 */}
        <div className="space-y-4">
          {sortedNotes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Link href={`/frontend/notes/${note.slug}`} className="block group">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm group-hover:shadow-md group-hover:border-blue-100 transition-all duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors mb-2">
                        {note.title}
                      </h2>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{formatDate(note.createdAt)}</span>
                        </div>
                        {note.category && (
                          <div className="flex items-center gap-1">
                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-xs font-medium">
                              {note.category.name}
                            </span>
                          </div>
                        )}
                        {(note.tags as string[])?.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Tag size={14} />
                            <div className="flex gap-1">
                              {(note.tags as string[]).slice(0, 3).map(tag => (
                                <span key={tag} className="text-gray-500">#{tag}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="hidden md:block text-gray-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all">
                      <ChevronRight size={24} />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {!loading && sortedNotes.length === 0 && (
            <div className="text-center py-20 text-gray-400 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
              还没有发布过笔记哦 ~
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
