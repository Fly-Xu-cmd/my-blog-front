import Contact from "@/composes/Contact";

/**
 * 网站顶部导航栏组件
 * 包含柔和渐变背景和固定定位功能
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="flex justify-between px-6 h-20 items-center bg-white shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">若木的小世界</h1>
        </div>
        <div className="h-full flex">
          <ul className="flex space-x-4 h-full items-center">
            <li className="h-full px-2 flex items-center active text-lg font-medium mr-5 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer">
              首页
            </li>
            <li className="h-full px-2 flex items-center text-lg font-medium mr-5 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer">
              博客
            </li>
            <li className="h-full px-2 flex items-center text-lg font-medium text-gray-700 hover:text-gray-900 transition-colors cursor-pointer">
              关于我
            </li>
          </ul>
        </div>
        <div>
          <Contact />
        </div>
      </div>
    </header>
  );
}
