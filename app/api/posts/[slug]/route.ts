import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
// 获取单篇文章
export async function GET(req: Request, context: { params: { slug: string } }) {
  const { params } = await context;
  const { slug } = await params; // ✅ await 访问

  if (!slug) {
    return new Response(JSON.stringify({ error: "缺少 slug 参数" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { slug },
    });

    if (!post) {
      return new Response(JSON.stringify({ error: "文章未找到" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, post }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "服务器内部错误" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
// 局部文章更新（后台调用）
export async function PATCH(
  req: Request,
  context: { params: { slug: string } }
) {
  const { params } = await context;
  const slug = await params.slug; // ✅ await 访问

  if (!slug) {
    return new Response(JSON.stringify({ error: "缺少 slug 参数" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const body = await req.json();
    const { title, excerpt, content, cover, published, categoryId, tags } =
      body;
    const post = await prisma.post.update({
      where: { slug },
      data: {
        title,
        excerpt,
        content,
        cover,
        published: !!published,
        categoryId: categoryId || undefined,
        tags: {
          set: tags.map((tag: string) => ({
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
    return NextResponse.json(JSON.stringify({ ok: true, post }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return NextResponse.json(JSON.stringify({ error: "服务器内部错误" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
// 删除文章
export async function DELETE(
  req: Request,
  context: { params: { slug: string } }
) {
  const { params } = context;
  const slug = await params.slug; // ✅ await 访问

  if (!slug) {
    return new Response(JSON.stringify({ error: "缺少 slug 参数" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const post = await prisma.post.delete({
      where: { slug },
    });
    return NextResponse.json(JSON.stringify({ ok: true, post }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return NextResponse.json(JSON.stringify({ error: "服务器内部错误" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
// 更新文章
export async function PUT(req: Request, context: { params: { slug: string } }) {
  const { params } = context;
  const slug = await params.slug; // ✅ await 访问

  if (!slug) {
    return new Response(JSON.stringify({ error: "缺少 slug 参数" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const body = await req.json();
    const { title, excerpt, content, cover, published, categoryId, tags } =
      body;
    const post = await prisma.post.update({
      where: { slug },
      data: {
        title,
        excerpt,
        content,
        cover,
        published: !!published,
        categoryId: categoryId || undefined,
        tags: {
          set: tags.map((tag: string) => ({
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
    return NextResponse.json(JSON.stringify({ ok: true, post }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return NextResponse.json(JSON.stringify({ error: "服务器内部错误" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
