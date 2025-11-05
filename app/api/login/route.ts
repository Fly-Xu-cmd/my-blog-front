import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  const { ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET } = process.env;
  const { username, password, remember } = await req.json();
  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "用户名或密码不能为空" },
      { status: 400 }
    );
  }
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: "用户名或密码错误" },
      { status: 400 }
    );
  }
  const token = jwt.sign({ username }, JWT_SECRET!, {
    expiresIn: remember ? "7d" : "1h",
  });
  return NextResponse.json({ ok: true, data: { token } });
}
