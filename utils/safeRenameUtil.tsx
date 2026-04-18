import path from "path";
import { v4 as uuidv4 } from "uuid";

export function safeRename(file: File, allowedExtensions?: string[]): string {
  // --- 安全重命名 ---
  // 不管用户上传的文件名叫什么，我们强制重命名为 UUID
  // 获取安全的后缀名 (基于 MIME 类型判断，或者简单提取后缀但要校验)
  const originalExt = path.extname(file.name).toLowerCase();

  // 二次确认后缀名也在白名单范围内 (双重保险)
  const allowedExts = allowedExtensions || [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
  ];
  if (!allowedExts.includes(originalExt)) {
    throw new Error("不支持的文件格式");
  }

  // 生成纯随机文件名，比如：550e8400-e29b-41d4-a716-446655440000.png
  const uniqueName = `${uuidv4()}${originalExt}`;

  return uniqueName;
}
