import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// 校验token
export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "token不能为空" },
      { status: 400 }
    );
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return NextResponse.json({ ok: true, data: decoded });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { ok: false, error: "token无效" },
      { status: 400 }
    );
  }
}
