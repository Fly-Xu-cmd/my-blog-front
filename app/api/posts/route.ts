import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// 获取所有文章
export async function GET() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    include: { category: true, tags: { include: { tag: true } } },
  });
  const formatted = posts.map((p) => ({
    ...p,
    tags: p.tags.map((pt) => pt.tag.name),
  }));
  return NextResponse.json({ ok: true, formatted });
}

// 新增文章（后台调用）
export async function POST(req: Request) {
  const body = await req.json();
  const { title, slug, excerpt, content, cover, published, categoryId, tags } =
    body;
  const post = await prisma.post.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      cover,
      published: !!published,
      categoryId: categoryId || undefined,
      tags: {
        create: tags.map((tag: string) => ({
          tag: {
            connectOrCreate: {
              where: { name: tag },
              create: { name: tag },
            },
          },
        })),
      },
    },
    include: {
      tags: { include: { tag: true } },
      category: true,
    },
  });
  return NextResponse.json(post);
}
