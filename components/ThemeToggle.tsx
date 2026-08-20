"use client";
import { useRef } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Dropdown } from "antd";
import { useTheme, type Theme } from "@/components/ThemeProvider";

const options: { key: Theme; label: string; icon: React.ReactNode }[] = [
  { key: "light", label: "浅色", icon: <Sun size={16} /> },
  { key: "dark", label: "深色", icon: <Moon size={16} /> },
  { key: "system", label: "跟随系统", icon: <Monitor size={16} /> },
];

/**
 * 主题切换按钮组件
 * 点击时获取按钮在视口中的中心坐标，传递给 View Transition 动画作为扩散原点
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const btnRef = useRef<HTMLButtonElement>(null);

  const current = options.find((o) => o.key === theme) || options[2];

  const items = options.map((o) => ({
    key: o.key,
    label: (
      <div className="flex items-center gap-2">
        {o.icon}
        <span>{o.label}</span>
        {o.key === theme && <span className="ml-auto text-cyan-400">✓</span>}
      </div>
    ),
  }));

  /**
   * 获取按钮中心在视口中的坐标，作为动画扩散原点
   */
  const getOrigin = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  };

  return (
    <Dropdown
      menu={{
        items,
        selectable: true,
        selectedKeys: [theme],
        onClick: ({ key }) => setTheme(key as Theme, getOrigin()),
      }}
      trigger={["click"]}
      placement="bottom"
      getPopupContainer={() => document.body}
      overlayStyle={{ marginTop: 8 }}
    >
      <button
        ref={btnRef}
        aria-label="切换主题"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10"
      >
        {current.icon}
      </button>
    </Dropdown>
  );
}