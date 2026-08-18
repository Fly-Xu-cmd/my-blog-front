import Link from "next/link";

const themes = [
  {
    href: "/themes/neon",
    name: "暗黑霓虹",
    desc: "深黑藏青底 + 青紫霓虹发光 + 玻璃拟态",
    color: "from-cyan-400 via-violet-400 to-fuchsia-400",
    emoji: "🌌",
  },
  {
    href: "/themes/terminal",
    name: "极客终端",
    desc: "命令行美学 · 等宽字体 · 绿/青配色",
    color: "from-green-400 to-cyan-400",
    emoji: "⌨️",
  },
  {
    href: "/themes/cyber",
    name: "赛博朋克",
    desc: "霓虹网格 · 故障风 · 高饱和冲击",
    color: "from-fuchsia-500 via-pink-500 to-cyan-400",
    emoji: "⚡",
  },
];

export default function ThemeIndex() {
  return (
    <main className="min-h-screen bg-[#05060a] text-white flex flex-col items-center justify-center px-6 py-16">
      <p className="text-sm text-white/50 font-mono mb-3">theme preview</p>
      <h1 className="text-4xl md:text-5xl font-bold mb-12 text-center">
        选择一个
        <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          主题风格
        </span>
      </h1>
      <div className="grid gap-6 md:grid-cols-3 max-w-4xl w-full">
        {themes.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
          >
            <div className="text-4xl mb-4">{t.emoji}</div>
            <div
              className={`text-2xl font-bold bg-gradient-to-r ${t.color} bg-clip-text text-transparent`}
            >
              {t.name}
            </div>
            <p className="mt-2 text-sm text-white/50">{t.desc}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm text-white/70 group-hover:text-white transition-colors">
              预览
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
