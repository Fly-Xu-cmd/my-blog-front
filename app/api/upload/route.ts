import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// 1. 定义允许的上传类型 (白名单)
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

// 2. 定义文件大小限制 (例如 5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const uploadDir = path.join(process.cwd(), "public", "uploads");

// 确保目录存在
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    // --- 校验 1: 是否有文件 ---
    if (!file) {
      return NextResponse.json(
        { ok: false, error: "未检测到文件" },
        { status: 400 },
      );
    }

    // --- 校验 2: 文件大小 ---
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "文件大小不能超过 5MB" },
        { status: 400 },
      );
    }

    // --- 校验 3: 文件类型 (最关键的一步) ---
    // 黑客如果上传 .sh 或 .exe，在这里就会被拦截
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "不支持的文件格式，仅允许上传图片" },
        { status: 403 },
      );
    }

    // 读取文件数据
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // --- 安全重命名 ---
    // 不管用户上传的文件名叫什么，我们强制重命名为 UUID
    // 获取安全的后缀名 (基于 MIME 类型判断，或者简单提取后缀但要校验)
    const originalExt = path.extname(file.name).toLowerCase();

    // 二次确认后缀名也在白名单范围内 (双重保险)
    const allowedExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    if (!allowedExts.includes(originalExt)) {
      return NextResponse.json(
        { ok: false, error: "非法的文件后缀" },
        { status: 403 },
      );
    }

    // 生成纯随机文件名，比如：550e8400-e29b-41d4-a716-446655440000.png
    const uniqueName = `${uuidv4()}${originalExt}`;
    const filePath = path.join(uploadDir, uniqueName);

    // 写入文件
    await fs.promises.writeFile(filePath, buffer);

    console.log(`[Upload Success] ${uniqueName} (${file.size} bytes)`);

    return NextResponse.json({
      ok: true,
      url: `/uploads/${uniqueName}`, // 返回给前端的路径
    });
  } catch (err) {
    console.error("上传服务出错:", err);
    return NextResponse.json(
      { ok: false, error: "服务器内部错误" },
      { status: 500 },
    );
  }
}
