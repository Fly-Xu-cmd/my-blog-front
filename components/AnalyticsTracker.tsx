"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

/** 访客 ID 在 localStorage 中的存储键 */
const VISITOR_ID_KEY = "blog_visitor_id";

/** 心跳发送间隔（毫秒） */
const HEARTBEAT_INTERVAL_MS = 30000;

/**
 * 获取或创建匿名访客 ID
 * 读取 localStorage 中的 blog_visitor_id，不存在则用 uuid 生成并写入。
 * 该 ID 仅代表匿名浏览器（非用户身份），路由变化时不会重新生成。
 * @returns 访客 ID 字符串
 */
function getOrCreateVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = uuidv4();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

/**
 * 上报一次页面访问（PV）
 * @param path 当前路由路径
 * @param visitorId 访客 ID
 */
async function trackView(path: string, visitorId: string): Promise<void> {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, visitorId }),
    });
  } catch {
    // 统计上报失败时静默忽略，不得影响页面
  }
}

/**
 * 发送一次心跳并广播统计事件
 * 请求 /api/analytics/heartbeat，成功后通过 window 派发自定义事件
 * analytics:beat（detail 为 { online, pv, uv }），供页脚等组件消费。
 * @param visitorId 访客 ID
 */
async function sendHeartbeat(visitorId: string): Promise<void> {
  try {
    const res = await fetch("/api/analytics/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId }),
    });
    const data = await res.json();
    window.dispatchEvent(
      new CustomEvent("analytics:beat", {
        detail: { online: data.online, pv: data.pv, uv: data.uv },
      }),
    );
  } catch {
    // 心跳失败时静默忽略，不得影响页面
  }
}

/**
 * 流量统计追踪组件（不渲染 UI）
 * - 路由变化时上报 PV（用 ref 记录上次已上报路径防重复）
 * - 立即发送一次心跳，并按 30s 间隔持续心跳
 * - 页签隐藏时暂停心跳，重新可见时立即补发并重启定时器
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  // 上次已上报 PV 的路径，防止重复上报（兼容 StrictMode 双执行）
  const lastTrackedPathRef = useRef<string | null>(null);
  // 心跳定时器 ID，用 ref 管理防止重复创建
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const visitorId = getOrCreateVisitorId();

    // 路由变化时上报 PV；同一路径（含 StrictMode 重挂载）不重复上报
    if (lastTrackedPathRef.current !== pathname) {
      lastTrackedPathRef.current = pathname;
      trackView(pathname, visitorId);
    }

    /**
     * 停止心跳定时器
     */
    const stopHeartbeat = () => {
      if (heartbeatTimerRef.current !== null) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };

    /**
     * 启动心跳：立即发送一次，再按固定间隔持续发送
     */
    const startHeartbeat = () => {
      stopHeartbeat();
      sendHeartbeat(visitorId);
      heartbeatTimerRef.current = setInterval(() => {
        sendHeartbeat(visitorId);
      }, HEARTBEAT_INTERVAL_MS);
    };

    /**
     * 页签可见性变化：隐藏时暂停心跳，恢复可见时立即补发并重启
     */
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopHeartbeat();
      } else {
        startHeartbeat();
      }
    };

    startHeartbeat();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopHeartbeat();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname]);

  return null;
}
