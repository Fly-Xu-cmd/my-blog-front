"use client";
import { type Post } from "@/app/frontend/model";
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

// Post 组件
export default function PostDetail({ id }: Params) {
  const [loading, setLoading] = useState(true);
  const [dynamic, setDynamic] = useState<Post | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      const res = await fetch(`/api/dynamics/${id}`);
      const { data } = await res.json();
      if (!data) {
        setLoading(false);
        return;
      }
      setDynamic(data);
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
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-4">{dynamic.title}</h1>
      <div className="mt-6 text-lg leading-relaxed text-gray-800">
        <MyEditorPreview source={dynamic.content} />
      </div>
    </div>
  );
}
