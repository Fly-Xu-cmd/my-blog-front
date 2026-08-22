import type { Metadata } from "next";
import HomeFeed from "./HomeFeed";

/**
 * 博客首页（Server Component 入口）
 * 首页与域名根等价，canonical 指向站点根 /
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function FrontendPage() {
  return <HomeFeed />;
}
