"use client";
import { Moon, Sun, Monitor } from "lucide-react";
import { Dropdown } from "antd";
import { useTheme, type Theme } from "@/components/ThemeProvider";

const options: { key: Theme; label: string; icon: React.ReactNode }[] = [
  { key: "light", label: "浅色", icon: <Sun size={16} /> },
  { key: "dark", label: "深色", icon: <Moon size={16} /> },
  { key: "system", label: "跟随系统", icon: <Monitor size={16} /> },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

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

  return (
    <Dropdown
      menu={{
        items,
        selectable: true,
        selectedKeys: [theme],
        onClick: ({ key }) => setTheme(key as Theme),
      }}
      trigger={["click"]}
      placement="bottomRight"
      /* 浮层挂到 body：避免 header 的 sticky/backdrop-blur 影响定位与遮挡 */
      getPopupContainer={() => document.body}
      overlayStyle={{ marginTop: 8 }}
    >
      <button
        aria-label="切换主题"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10"
      >
        {current.icon}
      </button>
    </Dropdown>
  );
}
