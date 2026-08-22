import type { Metadata } from "next";
import NoteDetail from "@/components/NoteDetail";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, articleOpenGraph, extractDescription } from "@/lib/seo";

// 详情页按请求渲染，避免构建期连接数据库
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

/**
 * 根据笔记 slug 服务端直查数据库，生成笔记页 SEO 元数据
 * @param params 路由参数（含 slug）
 * @returns 笔记页 metadata（标题/描述/canonical/OG/twitter）
 */
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const url = absoluteUrl(`/frontend/notes/${slug}`);
  try {
    const note = await prisma.note.findUnique({
      where: { slug },
      select: { title: true, content: true },
    });
    if (!note) {
      return { title: "笔记未找到", ...articleOpenGraph("笔记未找到", "笔记不存在", url) };
    }
    const description = extractDescription(note.content || "");
    return {
      title: note.title,
      description,
      ...articleOpenGraph(note.title, description, url),
    };
  } catch {
    return { title: "笔记详情", ...articleOpenGraph("笔记详情", "阅读技术笔记", url) };
  }
}

/**
 * 笔记详情页（Server Component 入口）
 * 负责元数据与 Article 结构化数据，内容由客户端组件渲染
 */
export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  const url = absoluteUrl(`/frontend/notes/${slug}`);

  // 尽力生成 Article JSON-LD（失败不阻塞渲染）
  let jsonLd: Record<string, unknown> | null = null;
  try {
    const note = await prisma.note.findUnique({
      where: { slug },
      select: { title: true, content: true, createdAt: true, updatedAt: true },
    });
    if (note) {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: note.title,
        description: extractDescription(note.content || ""),
        datePublished: note.createdAt.toISOString(),
        dateModified: note.updatedAt.toISOString(),
        author: { "@type": "Person", name: "若木" },
        url,
        inLanguage: "zh-CN",
      };
    }
  } catch {
    // 忽略结构化数据生成失败
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <NoteDetail slug={slug} />
    </>
  );
}
