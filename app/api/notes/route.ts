import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// 格式化字符串为 slug 格式（核心工具函数）
const formatSlug = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
};

// 生成唯一 slug
const generateUniqueSlug = async (baseSlug: string): Promise<string> => {
  const existingNotes = await prisma.note.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });

  if (existingNotes.length === 0) return baseSlug;

  const slugs = existingNotes.map((n: { slug: string }) => n.slug);
  const maxIndex = slugs.reduce((max, slug) => {
    if (slug === baseSlug) return Math.max(max, 1);
    const match = slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);

  return `${baseSlug}-${maxIndex + 1}`;
};

// 获取所有笔记
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const published = searchParams.get("published");
  const category = searchParams.get("category");
  const tagName = searchParams.get("tags");

  try {
    const notes = await prisma.note.findMany({
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
    
    const formatted = notes.map(
      (n: { tags?: { tag: { name: string } }[] }) => ({
        ...n,
        tags: n.tags?.map((nt: { tag: { name: string } }) => nt.tag.name),
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

// 新增笔记
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, content, published, categoryId, tags } = body;

    let baseSlug = title
      ? formatSlug(title)
      : `note-${Date.now().toString(36)}`;

    if (!baseSlug) {
      baseSlug = `note-${Date.now().toString(36)}`;
    }

    const slug = await generateUniqueSlug(baseSlug);

    const note = await prisma.note.create({
      data: {
        title,
        slug,
        content,
        published: !!published,
        categoryId: categoryId || undefined,
        syncId: `local-${slug}-${Date.now()}`, // 前端创建的赋予特殊 syncId
        tags: {
          create:
            tags?.map((tag: string) => ({
              tag: {
                connectOrCreate: {
                  where: { name: tag },
                  create: { name: tag },
                },
              },
            })) || [],
        },
      },
      include: {
        tags: { include: { tag: true } },
        category: true,
      },
    });

    return NextResponse.json({ ok: true, data: note });
  } catch (error) {
    console.error("创建笔记失败：", error);
    return NextResponse.json(
      { ok: false, error: "创建笔记失败" },
      { status: 500 }
    );
  }
}
