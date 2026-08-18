"use client";
import NewBlogs from "@/components/NewBlogs";
import NewStatus from "@/components/NewStatus";
import { Segmented, Spin } from "antd";
import { useEffect, useState } from "react";

// 获取博客文章
const fetchBlogPosts = async () => {
  const res = await fetch(`/api/posts?current=1&size=10`);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
};

// 获取动态数据
const fetchStatus = async () => {
  const res = await fetch(`/api/dynamics?current=1&size=10`);
  return res.json();
};

/**
 * 博客首页组件
 * 现代 hero + Segmented 切换博客/动态
 */
export default function FrontendPage() {
  const [tab, setTab] = useState<string | number>("blogs");
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const postsData = await fetchBlogPosts();
        setPosts(postsData.data || []);
        const statusData = await fetchStatus();
        setStatus(statusData.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-3xl mx-auto text-center pt-16 pb-12 px-4">
          <div className="mt-8 flex justify-center">
            <Segmented
              size="large"
              value={tab}
              onChange={setTab}
              options={[
                { label: "最新博客", value: "blogs" },
                { label: "最新动态", value: "dynamics" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* 内容区 */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-24">
            <Spin size="large" />
          </div>
        ) : tab === "blogs" ? (
          <NewBlogs posts={posts} />
        ) : (
          <NewStatus status={status} />
        )}
      </section>
    </div>
  );
}
