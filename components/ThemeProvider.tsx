"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { ConfigProvider, theme as antdTheme } from "antd";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  // 初始化：读取本地存储
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme") as Theme | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setTheme(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // 应用主题到 <html> 的 class，并记录「实际生效」的主题
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark =
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
      setResolvedTheme(dark ? "dark" : "light");
    };
    apply();

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  // 真正切换主题（同步切 .dark，供 View Transition 捕获“新主题”快照）
  const applyTheme = (t: Theme) => {
    const dark =
      t === "dark" ||
      (t === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    setResolvedTheme(dark ? "dark" : "light");
    setTheme(t);
    try {
      if (t === "system") {
        localStorage.removeItem("theme");
      } else {
        localStorage.setItem("theme", t);
      }
    } catch {
      /* ignore */
    }
  };

  const handleSetTheme = (t: Theme) => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };

    const commit = () => flushSync(() => applyTheme(t));

    // 浏览器支持 View Transitions：新主题从右上角圆形展开，旧主题渐被覆盖
    if (typeof doc.startViewTransition === "function") {
      const name = `theme-reveal-${Date.now()}`;
      const styleEl = document.createElement("style");
      styleEl.textContent = `
        @keyframes ${name} {
          from { clip-path: circle(0px at 100% 0%); }
          to { clip-path: circle(150vmax at 100% 0%); }
        }
        ::view-transition-old(root) { animation: none; }
        ::view-transition-new(root) { animation: ${name} 1.25s cubic-bezier(0.4, 0, 0.2, 1) both; }
      `;
      document.head.appendChild(styleEl);

      const transition = doc.startViewTransition(commit);
      transition.finished?.finally?.(() => styleEl.remove());
    } else {
      applyTheme(t);
    }
  };

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme: handleSetTheme }}
    >
      {/* 让所有 Ant Design 组件（含主题切换下拉框）跟随主题系统 */}
      <ConfigProvider
        theme={{
          algorithm:
            resolvedTheme === "dark"
              ? antdTheme.darkAlgorithm
              : antdTheme.defaultAlgorithm,
          token: {
            // 浮层 z-index 高于 header（z-[9999]），下拉框不会被导航遮挡
            zIndexPopupBase: 11000,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
