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

// 格式化字符串为 slug 格式（核心工具函数）
const formatSlug = (str: string): string => {
  return str
    .toLowerCase() // 转小写
    .replace(/[^\w\s-]/g, "") // 移除特殊字符（保留字母、数字、空格、连字符）
    .trim() // 去除首尾空格
    .replace(/[\s-]+/g, "-"); // 用连字符替换空格和连续连字符
};

// 生成唯一 slug（检查重复并添加序号）
const generateUniqueSlug = async (baseSlug: string): Promise<string> => {
  // 查询是否存在相同 slug
  const existingPosts = await prisma.post.findMany({
    where: {
      slug: {
        startsWith: baseSlug,
      },
    },
    select: { slug: true },
  });

  if (existingPosts.length === 0) {
    return baseSlug; // 无重复，直接使用
  }

  // 提取已有序号，找到最大序号
  const slugs = existingPosts.map((p) => p.slug);
  const maxIndex = slugs.reduce((max, slug) => {
    if (slug === baseSlug) return Math.max(max, 1); // 基础 slug 算序号 1
    const match = slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);

  return `${baseSlug}-${maxIndex + 1}`; // 生成下一个序号的 slug
};

// 新增文章（后端生成 slug）
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, excerpt, content, cover, published, categoryId, tags } =
      body;

    // 1. 生成基础 slug（从标题提取，标题为空则用时间戳）
    let baseSlug = title
      ? formatSlug(title)
      : `post-${Date.now().toString(36)}`; // 标题为空时的默认值

    // 2. 确保 slug 不为空（极端情况处理）
    if (!baseSlug) {
      baseSlug = `post-${Date.now().toString(36)}`;
    }

    // 3. 生成唯一 slug
    const slug = await generateUniqueSlug(baseSlug);

    // 4. 创建文章
    const post = await prisma.post.create({
      data: {
        title,
        slug, // 使用后端生成的 slug
        excerpt,
        content,
        cover,
        published: !!published,
        categoryId: categoryId || undefined,
        tags: {
          create:
            tags?.map((tag: string) => ({
              tag: {
                connectOrCreate: {
                  where: { name: tag },
                  create: { name: tag },
                },
              },
            })) || [], // 处理 tags 为空的情况
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
  } catch (error) {
    console.error("创建文章失败：", error);
    return NextResponse.json(
      { ok: false, error: "创建文章失败" },
      { status: 500 }
    );
  }
}
