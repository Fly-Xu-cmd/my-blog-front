"use client";
import React, { useEffect, useState } from "react";

/** analytics:beat 事件携带的统计数据 */
interface StatsDetail {
  online: number;
  pv: number;
  uv: number;
}

/**
 * 站点页脚组件
 * 监听 AnalyticsTracker 广播的 analytics:beat 自定义事件，
 * 展示全站 PV / UV / 当前在线人数及版权信息（初始显示 "-"）。
 */
export default function Footer() {
  const [stats, setStats] = useState<StatsDetail | null>(null);

  useEffect(() => {
    /**
     * 处理心跳广播事件，更新统计数据
     * @param event analytics:beat 事件对象
     */
    const handleBeat = (event: Event) => {
      const detail = (event as CustomEvent<StatsDetail>).detail;
      if (detail) {
        setStats(detail);
      }
    };

    window.addEventListener("analytics:beat", handleBeat);
    return () => {
      window.removeEventListener("analytics:beat", handleBeat);
    };
  }, []);

  return (
    <footer className="w-full border-t border-gray-200/60 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          总访问 {stats?.pv ?? "-"} · 访客 {stats?.uv ?? "-"} · 在线{" "}
          {stats?.online ?? "-"}
        </p>
        <p className="mt-2 text-xs">
          © {new Date().getFullYear()} 若木的小世界
        </p>
      </div>
    </footer>
  );
}
