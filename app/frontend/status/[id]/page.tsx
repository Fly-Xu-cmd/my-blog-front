import type { Metadata } from "next";
import StatusDetail from "../components/StatusDetail";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, extractDescription } from "@/lib/seo";

// 详情页按请求渲染，避免构建期连接数据库
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

/**
 * 根据动态 id 服务端直查数据库，生成动态页 SEO 元数据
 * @param params 路由参数（含 id）
 * @returns 动态页 metadata（标题/描述/canonical）
 */
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const url = absoluteUrl(`/frontend/status/${id}`);
  try {
    const dynamicRow = await prisma.dynamic.findUnique({
      where: { id: Number(id) },
      select: { title: true, excerpt: true, content: true },
    });
    if (!dynamicRow) {
      return { title: "动态未找到", alternates: { canonical: url } };
    }
    const description = extractDescription(
      dynamicRow.excerpt || dynamicRow.content || "",
      100,
    );
    return {
      title: dynamicRow.title || `动态 #${id}`,
      description,
      alternates: { canonical: url },
    };
  } catch {
    return { title: "动态详情", alternates: { canonical: url } };
  }
}

/**
 * 动态详情页（Server Component 入口）
 * 元数据由本文件负责，内容由客户端组件渲染
 */
export default async function Status({ params }: { params: Params }) {
  const { id } = await params;
  return <StatusDetail id={id} />;
}
