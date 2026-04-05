"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Save, Globe, Lock, Hash, Type } from "lucide-react";

function NoteEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams?.get("slug");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(true);
  const [loading, setLoading] = useState(!!slug);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slug) {
      fetch(`/api/notes/${slug}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setTitle(data.data.title);
            setContent(data.data.content);
            setPublished(data.data.published);
            setTags((data.data.tags || []).join(", "));
          }
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [slug]);

  const handleSave = async () => {
    if (!title || !content) {
      alert("请填写完整的标题和内容");
      return;
    }

    setSaving(true);
    const tagArray = tags.split(",").map(t => t.trim()).filter(Boolean);

    const payload = {
      title,
      content,
      published,
      tags: tagArray,
    };

    const url = slug ? `/api/notes/${slug}` : "/api/notes";
    const method = slug ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (data.ok) {
        router.push(`/frontend/notes/${data.data.slug}`);
      } else {
        alert(data.error || "保存失败");
      }
    } catch (err) {
      console.error(err);
      alert("网络错误，请稍后再试");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="font-medium">正在初始化编辑器...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white text-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        {/* 顶部工具栏 */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b border-gray-100 pb-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/frontend/notes"
              className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-all"
            >
              <ChevronLeft size={24} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {slug ? '编辑笔记' : '创作新笔记'}
              </h1>
              <p className="text-xs text-gray-400">所有的改动都会在点击保存后生效</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setPublished(!published)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                published 
                  ? 'bg-green-50 text-green-600 border-green-100' 
                  : 'bg-gray-50 text-gray-500 border-gray-100'
              }`}
            >
              {published ? <Globe size={16} /> : <Lock size={16} />}
              {published ? '公开展示' : '仅自己可见'}
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-100"
            >
              <Save size={18} />
              {saving ? '正在保存...' : '立即保存'}
            </button>
          </div>
        </header>

        {/* 内容输入区 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col gap-6"
        >
          <div className="relative group">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors">
              <Type size={24} />
            </div>
            <input
              type="text"
              placeholder="输入一个吸引人的标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-gray-200 focus:ring-0 pl-10"
            />
          </div>
          
          <div className="relative group">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors">
              <Hash size={18} />
            </div>
            <input
              type="text"
              placeholder="添加标签，用逗号分隔（如：生活, 记录, 灵感）"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full text-sm bg-transparent border-none outline-none placeholder-gray-300 focus:ring-0 pl-8 pb-1"
            />
            <div className="absolute bottom-0 left-8 right-0 h-[1px] bg-gray-100 group-focus-within:bg-blue-100 transition-all"></div>
          </div>

          <textarea
            placeholder="开始记录你的想法... (支持 Markdown 语法)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full flex-1 min-h-[500px] bg-transparent border-none outline-none placeholder-gray-200 focus:ring-0 resize-none text-lg leading-relaxed mt-4 text-gray-700"
          />
        </motion.div>
      </div>
    </div>
  );
}

export default function NoteEditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex justify-center items-center text-gray-400">正在进入创作空间...</div>}>
      <NoteEditor />
    </Suspense>
  );
}
