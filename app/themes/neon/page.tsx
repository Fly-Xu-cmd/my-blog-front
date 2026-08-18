const nav = ["首页", "博客", "动态", "笔记", "关于我"];

const posts = [
  {
    title: "深入浅出 React Server Components",
    tag: "React",
    date: "2026-08-01",
    excerpt: "RSC 不是银弹，但它彻底改变了数据获取与渲染的心智模型……",
  },
  {
    title: "从零构建一个 RAG 问答系统",
    tag: "AI",
    date: "2026-07-18",
    excerpt: "向量检索、重排序、提示工程，一套可落地的私域知识库方案……",
  },
  {
    title: "TypeScript 类型体操实战",
    tag: "TS",
    date: "2026-06-30",
    excerpt: "用分布式条件类型、infer 与模板字面量，写出优雅的类型级编程……",
  },
];

export default function NeonTheme() {
  return (
    <main className="min-h-screen bg-[#05060a] text-white overflow-x-hidden relative">
      <style>{`
        @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(40px,-30px)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,20px)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,40px)} }
      `}</style>

      {/* 极光背景 */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-cyan-500/20 blur-[120px]" style={{ animation: "float1 14s ease-in-out infinite" }} />
        <div className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-violet-500/20 blur-[120px]" style={{ animation: "float2 16s ease-in-out infinite" }} />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-[120px]" style={{ animation: "float3 18s ease-in-out infinite" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#05060a_75%)]" />
      </div>

      {/* 导航 */}
      <nav className="sticky top-0 z-20 border-b border-white/10 bg-[#05060a]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-bold text-black shadow-[0_0_20px_rgba(34,211,238,0.5)]">
              若
            </span>
            <span className="font-bold">若木的小世界</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm text-white/60">
            {nav.map((n, i) => (
              <span key={n} className={`cursor-pointer transition-colors hover:text-white ${i === 0 ? "text-white" : ""}`}>
                {n}
              </span>
            ))}
          </div>
          <div className="text-xs font-mono text-cyan-300/70">~/digital-garden</div>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-sm text-cyan-300">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          持续更新的技术笔记
        </div>
        <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight">
          探索思想的
          <span className="block bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            无限可能
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-white/50">
          分享前端、后端与 AI 的实战心得，记录成长的每一步。
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <button className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-7 py-3 font-semibold text-black shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-transform hover:scale-105">
            开始阅读
          </button>
          <button className="rounded-full border border-white/20 px-7 py-3 font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white">
            关于我
          </button>
        </div>
      </header>

      {/* 博客卡片 */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-8 flex items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-400/30" />
          <span className="font-mono text-sm text-cyan-300">{"// latest posts"}</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-cyan-400/30" />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {posts.map((p) => (
            <article
              key={p.title}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-[0_0_40px_rgba(34,211,238,0.15)]"
            >
              <div className="mb-4 flex items-center justify-between text-xs">
                <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2.5 py-1 text-violet-300">
                  {p.tag}
                </span>
                <span className="font-mono text-white/40">{p.date}</span>
              </div>
              <h3 className="mb-3 text-lg font-bold leading-snug text-white transition-colors group-hover:text-cyan-300">
                {p.title}
              </h3>
              <p className="text-sm text-white/50">{p.excerpt}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 页脚 */}
      <footer className="border-t border-white/10 py-10 text-center text-sm text-white/40">
        <p>© 2026 若木的小世界 · 用代码浇灌的数字花园</p>
      </footer>
    </main>
  );
}
