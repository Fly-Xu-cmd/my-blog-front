"use client";

import { Dynamic } from "@/app/frontend/model";
import Dynamics from "@/components/Dynamics";
import { Spin } from "antd";
import { useEffect, useState } from "react";

/**
 * 所有动态展示页面组件
 * 使用时间线布局展示所有动态内容，按日期倒序排列
 */
export default function AllStatusLayout() {
  const [status, setStatus] = useState<{ ok: boolean; data: Dynamic[] } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /**
     * 从数据库获取所有动态内容
     */
    const getAllStatus = async () => {
      try {
        // 使用相对路径，在客户端运行时会被正确解析
        const res = await fetch(`/api/dynamics`);
        if (!res.ok) {
          throw new Error("Failed to fetch status");
        }
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "获取动态失败");
      } finally {
        setLoading(false);
      }
    };

    getAllStatus();
  }, []);

  if (loading) {
    return (
      <div className="pl-8 md:pl-16 space-y-12">
        <Spin></Spin>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pl-8 md:pl-16 space-y-12">
        <div className="text-center py-8 text-red-500">错误: {error}</div>
      </div>
    );
  }

  if (!status || !status.ok) {
    return (
      <div className="pl-8 md:pl-16 space-y-12">
        <div className="text-center py-8">暂无动态内容</div>
      </div>
    );
  }

  // 对动态内容按日期排序（最新的在前）
  const sortedStatus = [...status.data].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="pl-8 md:pl-16 space-y-12">
      {sortedStatus.map((dynamic) => (
        <Dynamics key={dynamic.id} dynamic={dynamic} />
      ))}
    </div>
  );
}
