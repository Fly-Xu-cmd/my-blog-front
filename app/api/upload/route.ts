import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    console.log("req", formData);
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "没有上传文件" },
        { status: 400 }
      );
    }

    // 读取文件内容
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 获取文件扩展名
    const ext = path.extname(file.name) || "";
    const baseName = path.basename(file.name, ext);

    // 生成唯一文件名：时间戳 + 随机数
    const uniqueName = `${baseName}-${Date.now()}-${Math.floor(
      Math.random() * 10000
    )}${ext}`;

    // 保存文件到 public/uploads
    const filePath = path.join(uploadDir, uniqueName);
    await fs.promises.writeFile(filePath, buffer);

    // 返回访问 URL（public 下的文件可直接访问）
    const fileUrl = `/uploads/${uniqueName}`;

    return NextResponse.json({ ok: true, url: fileUrl });
  } catch (err) {
    console.error("上传失败:", err);
    return NextResponse.json(
      { ok: false, error: "文件上传失败" },
      { status: 500 }
    );
  }
}
