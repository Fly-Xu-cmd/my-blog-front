"use client";
import { useEffect, useState } from "react";
import { type Post } from "@/app/frontend/model";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Empty, message, Spin } from "antd";

// api获取文章详情
const getPostBySlug = async (slug: string) => {
  const res = await fetch(`/api/posts/${slug}`);
  return res.json();
};
// 格式化时间
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const contentStyle: React.CSSProperties = {
  padding: 50,
  background: "rgba(0, 0, 0, 0.05)",
  borderRadius: 4,
};

const content = <div style={contentStyle} />;

export default function Post({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getPostBySlug(slug)
      .then((data) => {
        setPost(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        message.error(err.message);
      });
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center flex-1">
        <Spin size="large" tip="加载中...">
          {content}
        </Spin>
      </div>
    );
  }
  if (!post) {
    return (
      <div className="flex justify-center items-center flex-1">
        <Empty />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <p className="text-sm text-gray-400">
        {post.category?.name} / {formatDate(post.createdAt)}
      </p>
      <p className="text-sm text-gray-400">
        {post.tags?.map((tag) => tag.name).join(" / ")}
      </p>
      <div className="mt-6 text-lg leading-relaxed text-gray-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
