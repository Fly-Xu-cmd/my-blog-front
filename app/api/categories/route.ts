import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      ok: true,
      data: categories,
      total: categories.length,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name)
    return NextResponse.json(
      { ok: false, error: "name required" },
      { status: 400 }
    );
  try {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    return NextResponse.json({ ok: true, data: cat });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const { name } = await req.json();
  if (!name)
    return NextResponse.json(
      { ok: false, error: "name required" },
      { status: 400 }
    );
  try {
    const cat = await prisma.category.delete({
      where: { name },
    });
    return NextResponse.json({ ok: true, data: cat });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const { name, newName } = await req.json();
  if (!name || !newName)
    return NextResponse.json(
      { ok: false, error: "name required" },
      { status: 400 }
    );
  try {
    const cat = await prisma.category.update({
      where: { name },
      data: { name: newName },
    });
    return NextResponse.json({ ok: true, data: cat });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
