import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
// 获取单篇文章
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params; // ✅ await 访问

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

    return new Response(JSON.stringify({ ok: true, data: post }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "服务器内部错误:" + err }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
// 删除文章
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params; // ✅ await 访问

  if (!slug) {
    return new Response(
      JSON.stringify({ ok: false, error: "缺少 slug 参数" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  try {
    // 先删除文章与标签的关联关系（PostTag记录），保留标签本身
    await prisma.postTag.deleteMany({
      where: { post: { slug } },
    });

    const post = await prisma.post.delete({
      where: { slug },
    });
    return NextResponse.json({ ok: true, data: post });
  } catch (err) {
    console.error("DELETE /api/posts/[slug] 错误:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "服务器内部错误",
        details: err instanceof Error ? err.message : String(err),
      },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
// 更新文章
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params; // ✅ await 访问

  if (!slug) {
    return new Response(
      JSON.stringify({ ok: false, error: "缺少 slug 参数" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  try {
    const body = await req.json();
    const { title, excerpt, content, cover, published, categoryId, tags } =
      body;
    const processedCategoryId = categoryId ? Number(categoryId) : undefined;
    const post = await prisma.post.update({
      where: { slug },
      data: {
        title,
        excerpt,
        content,
        cover,
        published: published === "true" ? true : false,
        categoryId: processedCategoryId,
        tags: {
          set: tags?.map((tag: string) => ({
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
    return NextResponse.json(
      { ok: true, data: post },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("更新文章失败:", err);
    return NextResponse.json(
      { ok: false, error: "服务器内部错误" },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
