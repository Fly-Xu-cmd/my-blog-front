import { prisma } from "@/lib/prisma";

export async function GET(req: Request, context: { params: { slug: string } }) {
  const { params } = context;
  const slug = await params.slug; // ✅ await 访问

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

    return new Response(JSON.stringify(post), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "服务器内部错误" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
