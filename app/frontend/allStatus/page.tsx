import { Dynamic } from "@/app/frontend/model";
import Link from "next/link";
import Dynamics from "@/components/Dynamics";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
// 从数据库获取所有动态内容
const getAllStatus = async () => {
  const res = await fetch(`${baseUrl}/api/dynamics`);
  if (!res.ok) {
    throw new Error("Failed to fetch status");
  }
  return res.json();
};
/**
 * 所有动态展示页面组件
 * 使用时间线布局展示所有动态内容，按日期倒序排列
 */
export default async function AllStatusLayout() {
  // 对动态内容按日期排序（最新的在前）
  const status: { ok: boolean; data: Dynamic[] } = await getAllStatus();
  if (!status.ok) {
    throw new Error("Failed to fetch status");
  }
  const sortedStatus = [...status.data].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="pl-8 md:pl-16 space-y-12">
      {sortedStatus.map((dynamic, index) => (
        <Dynamics key={dynamic.id} dynamic={dynamic} />
      ))}
    </div>
  );
}
