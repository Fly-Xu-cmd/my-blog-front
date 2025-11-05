import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// 获取所有文章
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const published = searchParams.get("published");
  const category = searchParams.get("category");
  const tagName = searchParams.get("tags");

  try {
    const posts = await prisma.post.findMany({
      where: {
        published:
          String(published) === "true"
            ? { equals: true }
            : String(published) === "false"
            ? { equals: false }
            : undefined,
        category: category ? { name: category } : undefined,
        tags: tagName
          ? {
              some: {
                tag: {
                  name: {
                    contains: tagName,
                  },
                },
              },
            }
          : undefined,
      },
      orderBy: { createdAt: "desc" },
      include: { category: true, tags: { include: { tag: true } } },
    });
    const formatted = posts.map(
      (p: { tags?: { tag: { name: string } }[] }) => ({
        ...p,
        tags: p.tags?.map((pt: { tag: { name: string } }) => pt.tag.name),
      })
    );
    return NextResponse.json({
      ok: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "服务器内部错误" });
  }
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
  return NextResponse.json({
    ok: true,
    data: post,
  });
}
