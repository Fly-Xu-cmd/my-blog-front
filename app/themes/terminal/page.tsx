const posts = [
  {
    cmd: "cat posts/react-server-components.md",
    title: "深入浅出 React Server Components",
    meta: "React · 8min read",
  },
  {
    cmd: "cat posts/rag-from-scratch.md",
    title: "从零构建一个 RAG 问答系统",
    meta: "AI · 12min read",
  },
  {
    cmd: "cat posts/typescript-type-gymnastics.md",
    title: "TypeScript 类型体操实战",
    meta: "TS · 6min read",
  },
];

export default function TerminalTheme() {
  return (
    <main className="min-h-screen bg-[#0a0e0c] text-[#c9d1c9] font-mono">
      <style>{`
        @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes glow { 0%,100%{opacity:.6} 50%{opacity:1} }
        .cursor::after { content:"█"; margin-left:2px; animation:blink 1s steps(1) infinite; color:#22c55e; }
      `}</style>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* 终端窗口 */}
        <div className="overflow-hidden rounded-xl border border-[#1f2937] bg-[#0d1117] shadow-2xl">
          {/* 标题栏 */}
          <div className="flex items-center gap-2 border-b border-[#1f2937] bg-[#161b22] px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
            <span className="ml-3 text-xs text-[#8b949e]">ruomu@blog: ~</span>
          </div>

          {/* 内容区 */}
          <div className="p-6 md:p-8">
            {/* hero 命令行 */}
            <div className="mb-10">
              <p className="text-[#8b949e]">
                <span className="text-[#22c55e]">$</span> whoami
              </p>
              <h1 className="mt-2 text-3xl md:text-5xl font-bold text-[#e6edf3]">
                若木的小世界<span className="text-[#22c55e] cursor"> </span>
              </h1>
              <p className="mt-4 text-[#8b949e]">
                <span className="text-[#22c55e]">$</span> echo &quot;分享技术 · 记录成长 · 探索无限可能&quot;
              </p>
              <p className="mt-1 text-[#e6edf3]">分享技术 · 记录成长 · 探索无限可能</p>
            </div>

            {/* 导航命令 */}
            <div className="mb-10 flex flex-wrap gap-x-6 gap-y-2 border-y border-[#1f2937] py-4 text-sm">
              {["首页", "博客", "动态", "笔记", "关于我"].map((n, i) => (
                <span key={n} className={`cursor-pointer transition-colors hover:text-[#22c55e] ${i === 0 ? "text-[#22c55e]" : "text-[#8b949e]"}`}>
                  ./{n}
                </span>
              ))}
            </div>

            {/* 博客列表：cat 命令 */}
            <div>
              <p className="mb-4 text-[#8b949e]">
                <span className="text-[#22c55e]">$</span> ls posts/
              </p>
              <div className="space-y-3">
                {posts.map((p) => (
                  <div key={p.title} className="group cursor-pointer">
                    <p className="text-[#8b949e]">
                      <span className="text-[#22c55e]">$</span>{" "}
                      <span className="group-hover:text-[#e6edf3] transition-colors">{p.cmd}</span>
                    </p>
                    <div className="ml-5 mt-2 rounded-lg border border-[#1f2937] bg-[#0a0e0c] p-4 transition-colors group-hover:border-[#22c55e]/40">
                      <h3 className="font-bold text-[#e6edf3]">{p.title}</h3>
                      <p className="mt-1 text-xs text-[#8b949e]">{p.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 动态 */}
            <div className="mt-10">
              <p className="mb-2 text-[#8b949e]">
                <span className="text-[#22c55e]">$</span> tail -f dynamics.log
              </p>
              <div className="rounded-lg border border-[#1f2937] p-4 text-sm text-[#e6edf3]">
                <span className="text-[#8b949e]">[2026-08-17 18:44:13]</span>{" "}
                今天把博客后台从 Modal 换成了全屏 Drawer，写长文终于不憋屈了 🚀
              </div>
            </div>

            {/* 页脚 */}
            <div className="mt-12 border-t border-[#1f2937] pt-6 text-xs text-[#8b949e]">
              <p>
                <span className="text-[#22c55e]">$</span> exit 0
              </p>
              <p className="mt-2">© 2026 若木的小世界 · ruomu@blog</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
