import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(tags);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name)
    return NextResponse.json({ error: "name required" }, { status: 400 });
  const tag = await prisma.tag.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return NextResponse.json(tag);
}
