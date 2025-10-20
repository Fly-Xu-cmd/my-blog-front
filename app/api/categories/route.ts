import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name)
    return NextResponse.json({ error: "name required" }, { status: 400 });
  const cat = await prisma.category.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return NextResponse.json(cat);
}
