import type { Metadata } from "next";
import ReadingLibrary from "./ReadingLibrary";
export const metadata: Metadata = {
  title: "我的阅读",
  description: "保存在当前浏览器的最近阅读与稍后再读。",
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <main className="editorial-page">
      <header>
        <h1 className="text-3xl font-semibold">我的阅读</h1>
        <p className="mt-3 text-gray-500">
          最近阅读与稍后再读，仅保存在当前浏览器，不跨设备同步。
        </p>
      </header>
      <ReadingLibrary />
    </main>
  );
}
