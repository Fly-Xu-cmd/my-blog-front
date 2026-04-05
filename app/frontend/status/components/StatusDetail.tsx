"use client";
import { type Dynamic } from "@/app/frontend/model";
import { Empty, Spin } from "antd";
import React, { useEffect, useState } from "react";
import MyEditorPreview from "@/components/MyEditorPreview";

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type Params = {
  id: string;
};

// Post 组件 (用于动态内容展示)
export default function PostDetail({ id }: Params) {
  const [loading, setLoading] = useState(true);
  const [dynamic, setDynamic] = useState<Dynamic | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      const res = await fetch(`/api/dynamics/${id}`);
      const result = await res.json();
      if (!result.data) {
        setLoading(false);
        return;
      }
      setDynamic(result.data);
      setLoading(false);
    };
    fetchPost();
  }, [id]);

  // 加载中或没有找到文章时的显示
  if (loading) {
    return (
      <div className="flex justify-center items-center flex-1">
        <Spin></Spin>
      </div>
    );
  }

  if (!dynamic) {
    return (
      <div className="flex justify-center items-center flex-1">
        <Empty />
      </div>
    );
  }

  // 渲染文章内容
  return (
    <div className="max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-10 bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px] break-words overflow-x-hidden">
      <header className="mb-8 border-b pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
          {dynamic.title || '动态详情'}
        </h1>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-xs font-medium">发布于</span>
          <span>{formatDate(dynamic.createdAt)}</span>
        </div>
      </header>
      
      <div className="text-gray-800 leading-relaxed">
        <MyEditorPreview source={dynamic.content} />
      </div>
    </div>
  );
}
