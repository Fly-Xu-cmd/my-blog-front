import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ ok: true, data: tags, total: tags.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "服务器内部错误" });
  }
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name)
    return NextResponse.json({ error: "name required" }, { status: 400 });
  try {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    return NextResponse.json({ ok: true, data: tag });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "服务器内部错误" });
  }
}

export async function DELETE(req: Request) {
  const { name } = await req.json();
  if (!name)
    return NextResponse.json({ error: "name required" }, { status: 400 });
  try {
    const tag = await prisma.tag.delete({
      where: { name },
    });
    return NextResponse.json({ ok: true, data: tag });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "服务器内部错误" });
  }
}

export async function PUT(req: Request) {
  const { name, newName } = await req.json();
  if (!name || !newName)
    return NextResponse.json({ error: "name required" }, { status: 400 });
  try {
    const tag = await prisma.tag.update({
      where: { name },
      data: { name: newName },
    });
    return NextResponse.json({ ok: true, data: tag });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "服务器内部错误" });
  }
}
