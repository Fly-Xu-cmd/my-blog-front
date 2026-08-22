import type { Metadata } from "next";
import PostDetail from "../components/PostDetail";
import { prisma } from "@/lib/prisma";
import {
  SITE_NAME,
  absoluteUrl,
  articleOpenGraph,
} from "@/lib/seo";

// 详情页按请求渲染，避免构建期连接数据库
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

/**
 * 根据文章 slug 服务端直查数据库，生成详情页 SEO 元数据
 * @param params 路由参数（含 slug）
 * @returns 文章页 metadata（标题/描述/canonical/OG/twitter）
 */
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const url = absoluteUrl(`/frontend/posts/${slug}`);
  try {
    const post = await prisma.post.findUnique({
      where: { slug },
      select: {
        title: true,
        excerpt: true,
        cover: true,
      },
    });
    if (!post) {
      return { title: "文章未找到", ...articleOpenGraph("文章未找到", "文章不存在或已下线", url) };
    }
    const description = post.excerpt?.slice(0, 150) || `${post.title} - ${SITE_NAME}原创技术文章`;
    return {
      title: post.title,
      description,
      ...articleOpenGraph(post.title, description, url, post.cover),
    };
  } catch {
    // 数据库不可达时返回基础元数据，保证页面可用
    return { title: "文章详情", ...articleOpenGraph("文章详情", "阅读技术文章", url) };
  }
}

/**
 * 文章详情页（Server Component 入口）
 * 负责元数据与 Article 结构化数据，内容由客户端组件渲染
 */
export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  const url = absoluteUrl(`/frontend/posts/${slug}`);

  // 尽力生成 Article JSON-LD（失败不阻塞渲染）
  let jsonLd: Record<string, unknown> | null = null;
  try {
    const post = await prisma.post.findUnique({
      where: { slug },
      select: {
        title: true,
        excerpt: true,
        cover: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (post) {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt?.slice(0, 150) || undefined,
        image: post.cover ? [post.cover] : undefined,
        datePublished: post.createdAt.toISOString(),
        dateModified: post.updatedAt.toISOString(),
        author: { "@type": "Person", name: "若木" },
        publisher: { "@type": "Organization", name: SITE_NAME },
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
      <PostDetail slug={slug} />
    </>
  );
}
