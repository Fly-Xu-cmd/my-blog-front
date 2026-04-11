"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { type Note } from "@/app/frontend/model";
import { Calendar, Tag, Search, FolderOpen } from "lucide-react";

// 获取所有笔记
const fetchAllNotes = async () => {
  const res = await fetch("/api/notes?published=true");
  return res.json();
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    fetchAllNotes().then((data) => {
      if (data.ok) {
        setNotes(data.data);
      }
      setLoading(false);
    });
  }, []);

  // Extract unique categories and tags
  const categories = useMemo(() => {
    const cats = new Set<string>();
    notes.forEach((note) => {
      if (note.category?.name) cats.add(note.category.name);
    });
    return Array.from(cats);
  }, [notes]);

  const tags = useMemo(() => {
    const t = new Set<string>();
    notes.forEach((note) => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach((tag) => {
          if (typeof tag === "string") {
            t.add(tag);
          } else if (tag && (tag as { tag?: { name: string } }).tag?.name) {
            t.add((tag as { tag?: { name: string } }).tag!.name);
          }
        });
      }
    });
    return Array.from(t);
  }, [notes]);

  // Sort and filter notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((note) => {
        const matchesSearch =
          searchTerm === "" ||
          note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (note.content &&
            note.content.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory =
          selectedCategory === null || note.category?.name === selectedCategory;

        let noteTags: string[] = [];
        if (note.tags && Array.isArray(note.tags)) {
          noteTags = note.tags
            .map((t) =>
              typeof t === "string"
                ? t
                : (t as { tag?: { name: string } }).tag?.name,
            )
            .filter((t): t is string => !!t);
        }

        const matchesTag =
          selectedTag === null || noteTags.includes(selectedTag);

        return matchesSearch && matchesCategory && matchesTag;
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [notes, searchTerm, selectedCategory, selectedTag]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className="  w-full bg-gradient-to-b from-indigo-50/50 via-white to-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-12">
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

        {/* 筛选与搜索 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10 space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          {/* 搜索框 */}
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="搜索笔记标题或内容..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none"
            />
          </div>

          {/* 分类筛选 */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <FolderOpen size={16} className="text-gray-400 mr-2" />
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedCategory === null ? "bg-blue-600 text-white shadow-md" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
              >
                全部
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedCategory === cat ? "bg-blue-600 text-white shadow-md" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* 标签筛选 */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Tag size={16} className="text-gray-400 mr-2" />
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedTag === null ? "bg-indigo-500 text-white shadow-md" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
              >
                全部
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedTag === tag ? "bg-indigo-500 text-white shadow-md" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </motion.div>

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

        {/* 笔记列表 - 网格布局 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredNotes.map((note) => {
              let noteTags: string[] = [];
              if (note.tags && Array.isArray(note.tags)) {
                noteTags = note.tags
                  .map((t) =>
                    typeof t === "string"
                      ? t
                      : (t as { tag?: { name: string } }).tag?.name,
                  )
                  .filter((t): t is string => !!t);
              }

              return (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <Link
                    href={`/frontend/notes/${note.slug}`}
                    className="block h-full group"
                  >
                    <div className="min-h-[200px] flex flex-col bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300">
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors mb-3 line-clamp-2">
                          {note.title}
                        </h2>

                        <div className="text-gray-500 text-sm mb-4 line-clamp-3">
                          {note.content
                            .replace(/[#*`_\[\]()]/g, "")
                            .substring(0, 100)}
                          ...
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-50 space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>{formatDate(note.updatedAt)}</span>
                          </div>
                          {note.category && (
                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-medium">
                              {note.category.name}
                            </span>
                          )}
                        </div>

                        {noteTags.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Tag size={12} className="text-gray-300" />
                            <div className="flex flex-wrap gap-1">
                              {noteTags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md"
                                >
                                  {tag}
                                </span>
                              ))}
                              {noteTags.length > 3 && (
                                <span className="text-xs text-gray-400">
                                  +{noteTags.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {!loading && filteredNotes.length === 0 && (
          <div className="text-center py-20 text-gray-400 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
            没有找到匹配的笔记哦 ~
          </div>
        )}
      </div>
    </div>
  );
}
