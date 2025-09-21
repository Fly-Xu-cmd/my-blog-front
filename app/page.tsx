import NewBlogs from "@/composes/NewBlogs";

/**
 * 博客首页组件
 * 展示博客文章列表，采用时间轴样式
 */
export default function Home() {
  return (
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

      {/* 最新博客篇 */}
      <div className="w-full  flex items-center justify-center my-4 text-3xl font-bold mb-10 text-center">
        最新博客
      </div>
      {/* 时间轴容器 */}
      <NewBlogs />
      {/* 动态篇 */}
    </div>
  );
}
