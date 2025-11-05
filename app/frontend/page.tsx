"use client";
import NewBlogs from "@/components/NewBlogs";
import NewStatus from "@/components/NewStatus";
import { Spin } from "antd";
import { useState, useEffect } from "react";

// 获取博客文章的
const fetchBlogPosts = async (params?: { current?: number; size?: number }) => {
  const res = await fetch(
    `/api/posts${
      params ? `?current=${params.current || 1}&size=${params.size || 10}` : ""
    }`
  );
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  const data = await res.json();
  return data;
};

// 获取动态数据
const fetchStatus = async (params?: { current?: number; size?: number }) => {
  const res = await fetch(
    `/api/dynamics${
      params ? `?current=${params.current || 1}&size=${params.size || 10}` : ""
    }`
  );
  const data = await res.json();
  return data;
};

/**
 * 博客首页组件
 * 展示博客文章列表，采用时间轴样式
 */
export default function FrontendPage() {
  const [isDynamic, setIsDynamic] = useState(false);
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
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);
  return (
    <>
      <div className="w-full p-6 bg-white min-h-screen">
        <div className="flex items-center justify-center">
          <h1 className="text-3xl font-bold mb-10 text-center">探索思想的</h1>
          <h1 className="text-3xl font-bold mb-10 text-center !text-[#00b8ff]">
            无限可能
          </h1>
        </div>

        <p className="text-center text-gray-600 mb-10">
          分享我在技术、生活和思考中的洞见、记录成长的每一步。这里是我的数字花园，欢迎驻足。
        </p>

        <div className="relative flex items-center justify-center mb-10">
          {/* 立方体3D场景容器 */}
          <div
            className="w-[var(--cube-size-w)] h-[var(--cube-size-h)]"
            style={
              {
                "--cube-size-w": "13rem", // 设置宽度的自定义属性
                "--cube-size-h": "7rem", // 设置高度的自定义属性
                perspective: "1000px", // 设置透视效果
                perspectiveOrigin: "50% 50%", // 设置透视原点
              } as React.CSSProperties
            }
          >
            {/* 立方体容器 - 根据isDynamic状态旋转 */}
            <div
              className="relative w-full h-full cursor-pointer"
              style={{
                transformStyle: "preserve-3d",
                transition: "transform 0.8s ease",
                transform: isDynamic ? "rotateX(90deg)" : "rotateX(0deg)",
              }}
            >
              {/* 正面：最新博客 */}
              <div
                className="absolute w-full h-full  bg-white rounded-lg shadow-lg"
                onClick={() => setIsDynamic(!isDynamic)}
                style={{
                  transform: "translateZ(calc(var(--cube-size-h) / 2))",
                  backfaceVisibility: "hidden",
                }}
              >
                <div className=" h-[60%] flex items-end justify-center text-3xl font-bold text-center ">
                  最新博客
                </div>
                {/* 切换按钮 */}
                <div className=" flex items-center justify-center cursor-pointer">
                  <i className="iconfont !text-2xl text-blue-500">&#xeb0d;</i>
                </div>
              </div>

              {/* 底面：最新动态 */}
              <div
                className="absolute w-full h-full  bg-white rounded-lg shadow-lg"
                onClick={() => setIsDynamic(!isDynamic)}
                style={{
                  transform:
                    "rotateX(-90deg) translateZ(calc(var(--cube-size-h) / 2))",
                  backfaceVisibility: "hidden",
                }}
              >
                <div className=" h-[60%] flex items-end justify-center text-3xl font-bold text-center ">
                  最新动态
                </div>
                {/* 切换按钮 */}
                <div className=" flex items-center justify-center cursor-pointer">
                  <i className="iconfont !text-2xl text-blue-500">&#xeb0d;</i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-[var(--cube-size-w)] overflow-hidden">
          {/* 立方体3D场景容器 */}
          <div
            className="w-[var(--cube-size-w)] h-full mx-auto"
            style={
              {
                "--cube-size-w": "70vw", // 设置宽度的自定义属性
                "--cube-size-h": "70vh", // 设置高度的自定义属性
                perspective: "1000000px", // 设置透视效果
                perspectiveOrigin: "50% 50%", // 设置透视原点
              } as React.CSSProperties
            }
          >
            {/* 立方体容器 - 根据isDynamic状态旋转 */}
            <div
              className="relative w-full h-full cursor-pointer"
              style={{
                transformStyle: "preserve-3d",
                transition: "transform 1s ease-in-out",
                transform: isDynamic ? "rotateY(-90deg)" : "rotateY(0deg)",
              }}
            >
              {/* 加载中状态 */}
              {loading && (
                <div className="w-full h-full flex items-center justify-center">
                  <Spin></Spin>
                </div>
              )}
              {/* 添加一个隐藏的占位元素来反映内容高度 */}
              <div className="opacity-0">
                {isDynamic ? (
                  <NewStatus status={status} />
                ) : (
                  <NewBlogs posts={posts} />
                )}
              </div>
              {/* 最新博客 - 添加translateZ */}
              <div
                className="absolute w-full top-0"
                style={{
                  transform: "translateZ(calc(var(--cube-size-w) / 2))",
                  backfaceVisibility: "hidden",
                }}
              >
                <NewBlogs posts={posts} />
              </div>
              {/* 最新动态 - 添加translateZ */}
              <div
                className="absolute w-full top-0"
                style={{
                  transform:
                    "rotateY(90deg) translateZ(calc(var(--cube-size-w) / 2))",
                  backfaceVisibility: "hidden",
                }}
              >
                <NewStatus status={status} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
