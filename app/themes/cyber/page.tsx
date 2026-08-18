const posts = [
  { title: "深入浅出 React Server Components", tag: "React", date: "2026.08" },
  { title: "从零构建一个 RAG 问答系统", tag: "AI", date: "2026.07" },
  { title: "TypeScript 类型体操实战", tag: "TS", date: "2026.06" },
];

export default function CyberTheme() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#07010f] text-white">
      <style>{`
        @keyframes scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes glitch { 0%,90%,100%{transform:translate(0);text-shadow:none} 92%{transform:translate(-2px,1px);text-shadow:2px 0 #ff00ff,-2px 0 #00ffff} 94%{transform:translate(2px,-1px);text-shadow:-2px 0 #ff00ff,2px 0 #00ffff} 96%{transform:translate(-1px,2px);text-shadow:1px 0 #ff00ff,-1px 0 #00ffff} }
      `}</style>

      {/* 网格背景 */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,0,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />
      {/* 扫描线 */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-24 bg-gradient-to-b from-fuchsia-500/10 to-transparent"
        style={{ animation: "scan 5s linear infinite" }}
      />

      <div className="relative mx-auto max-w-5xl px-6 py-10">
        {/* 导航 */}
        <nav className="mb-16 flex items-center justify-between border-b border-fuchsia-500/30 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center border border-cyan-400 bg-cyan-400/10 text-sm font-bold text-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.4)]">
              若
            </span>
            <span className="font-black tracking-wider" style={{ textShadow: "0 0 10px rgba(255,0,255,0.8)" }}>
              若木的小世界
            </span>
          </div>
          <div className="hidden md:flex gap-6 text-xs font-bold tracking-[0.2em] text-white/60">
            {["首页", "博客", "动态", "笔记", "关于我"].map((n, i) => (
              <span key={n} className={`cursor-pointer transition-colors hover:text-fuchsia-400 ${i === 0 ? "text-fuchsia-400" : ""}`}>
                {n}
              </span>
            ))}
          </div>
        </nav>

        {/* Hero */}
        <header className="mb-16 text-center">
          <p className="mb-4 font-mono text-xs tracking-[0.4em] text-cyan-300">{"// ENTER THE DIGITAL GARDEN"}</p>
          <h1
            className="text-5xl md:text-7xl font-black tracking-tight"
            style={{ animation: "glitch 4s infinite" }}
          >
            <span className="bg-gradient-to-r from-fuchsia-500 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
              探索思想的无限可能
            </span>
          </h1>
          <p className="mt-6 text-white/50">分享前端 · 后端 · AI 的实战心得</p>
          <div className="mt-8 flex justify-center gap-4">
            <button className="rounded-sm border border-fuchsia-500 bg-fuchsia-500/20 px-6 py-2.5 font-bold text-fuchsia-200 shadow-[0_0_20px_rgba(255,0,255,0.4)] transition-all hover:bg-fuchsia-500/40 hover:shadow-[0_0_30px_rgba(255,0,255,0.6)]">
              ▶ 进入
            </button>
            <button className="rounded-sm border border-cyan-400 px-6 py-2.5 font-bold text-cyan-300 shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all hover:bg-cyan-400/10">
              关于我
            </button>
          </div>
        </header>

        {/* 博客卡片 */}
        <section className="grid gap-5 md:grid-cols-3">
          {posts.map((p, i) => (
            <article
              key={p.title}
              className="group relative overflow-hidden rounded-sm border border-fuchsia-500/40 bg-white/[0.03] p-6 transition-all hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(255,0,255,0.25)]"
            >
              <div className="absolute right-0 top-0 border-l border-b border-fuchsia-500/40 px-3 py-1 font-mono text-xs text-fuchsia-400">
                0{i + 1}
              </div>
              <div className="mb-4 flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-widest text-cyan-300">[{p.tag}]</span>
                <span className="text-white/30">{p.date}</span>
              </div>
              <h3 className="font-bold leading-snug transition-colors group-hover:text-fuchsia-300">{p.title}</h3>
              <div className="mt-4 font-mono text-xs text-cyan-300/70 opacity-0 transition-opacity group-hover:opacity-100">
                &gt;&gt; READ_MORE_
              </div>
            </article>
          ))}
        </section>

        {/* 页脚 */}
        <footer className="mt-20 border-t border-fuchsia-500/30 pt-6 text-center font-mono text-xs tracking-widest text-white/40">
          SYSTEM ONLINE · © 2026 若木的小世界
        </footer>
      </div>
    </main>
  );
}
