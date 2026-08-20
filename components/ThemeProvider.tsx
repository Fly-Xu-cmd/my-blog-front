"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ConfigProvider, theme as antdTheme } from "antd";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeOrigin {
  x: number;
  y: number;
}

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme, origin?: ThemeOrigin) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

/**
 * 根据主题设置计算实际应使用的 dark 值
 */
function computeDark(t: Theme): boolean {
  if (t === "dark") return true;
  if (t === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * 应用主题到 DOM：切换 .dark class 并更新 resolvedTheme 状态
 */
function applyDom(
  dark: boolean,
  setResolvedTheme: (r: ResolvedTheme) => void,
) {
  document.documentElement.classList.toggle("dark", dark);
  setResolvedTheme(dark ? "dark" : "light");
}

/**
 * 持久化主题设置到 localStorage
 */
function persistTheme(t: Theme) {
  try {
    if (t === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", t);
    }
  } catch {
    /* ignore */
  }
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  /**
   * 标记本次主题变更是否由用户主动触发（View Transition 路径），
   * 避免 useEffect 中的 DOM 操作与 handleSetTheme 重复执行。
   */
  const userInitiatedRef = useRef(false);

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

  /**
   * 主题同步 effect：负责初始化和系统主题跟随。
   * 当变更由用户主动触发时（userInitiatedRef = true），跳过 DOM 操作，
   * 仅处理系统主题监听器的绑定/解绑。
   */
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const dark = computeDark(theme);
      root.classList.toggle("dark", dark);
      setResolvedTheme(dark ? "dark" : "light");
    };

    if (userInitiatedRef.current) {
      userInitiatedRef.current = false;
    } else {
      apply();
    }

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  /**
   * 用户主动切换主题（含 View Transition 动画）
   * @param t     目标主题
   * @param origin 动画扩散原点（相对于视口的坐标），默认右上角
   */
  const handleSetTheme = (t: Theme, origin?: ThemeOrigin) => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };

    const dark = computeDark(t);

    const commit = () =>
      flushSync(() => {
        applyDom(dark, setResolvedTheme);
        setTheme(t);
        persistTheme(t);
      });

    if (typeof doc.startViewTransition === "function") {
      userInitiatedRef.current = true;

      const ox = origin?.x ?? window.innerWidth;
      const oy = origin?.y ?? 0;

      const oxPct = ((ox / window.innerWidth) * 100).toFixed(2);
      const oyPct = ((oy / window.innerHeight) * 100).toFixed(2);

      const name = `theme-reveal-${Date.now()}`;
      const styleEl = document.createElement("style");
      styleEl.textContent = `
        @keyframes ${name} {
          from { clip-path: circle(0px at ${oxPct}% ${oyPct}%); }
          to   { clip-path: circle(150vmax at ${oxPct}% ${oyPct}%); }
        }
        @keyframes ${name}-fade {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        ::view-transition-old(root) {
          animation: ${name}-fade 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        ::view-transition-new(root) {
          animation: ${name} 0.85s cubic-bezier(0.4, 0, 0.2, 1) both;
        }
      `;

      try {
        document.head.appendChild(styleEl);
        const transition = doc.startViewTransition(commit);
        transition.finished?.finally?.(() => styleEl.remove());
      } catch {
        styleEl.remove();
        applyDom(dark, setResolvedTheme);
        setTheme(t);
        persistTheme(t);
      }
    } else {
      applyDom(dark, setResolvedTheme);
      setTheme(t);
      persistTheme(t);
    }
  };

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme: handleSetTheme }}
    >
      <ConfigProvider
        theme={{
          algorithm:
            resolvedTheme === "dark"
              ? antdTheme.darkAlgorithm
              : antdTheme.defaultAlgorithm,
          token: {
            zIndexPopupBase: 11000,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}