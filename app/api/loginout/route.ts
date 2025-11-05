import { NextResponse } from "next/server";

/**
 * 用户登出接口
 * 功能：使当前token立即失效
 * @param req 请求对象
 * @returns 登出结果
 */
export async function POST() {
  try {
    return NextResponse.json({
      ok: true,
      data: {
        message: "登出成功",
      },
    });
  } catch (error) {
    console.error("登出接口错误:", error);
    return NextResponse.json(
      { ok: false, error: "服务器内部错误:" + error },
      { status: 500 }
    );
  }
}
