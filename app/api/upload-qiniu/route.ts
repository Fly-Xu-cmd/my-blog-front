import * as qiniu from "qiniu";
import { NextResponse } from "next/server";
import { safeRename } from "@/utils/safeRenameUtil";
import crypto from "crypto";
import { redis } from "@/lib/redis";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 1. 获取鉴权对象 (Mac)
function getMac() {
  const accessKey = process.env.QINIU_ACCESS_KEY!;
  const secretKey = process.env.QINIU_SECRET_KEY!;
  return new qiniu.auth.digest.Mac(accessKey, secretKey);
}

// 2. 生成上传 Token (需要传入 mac)
function createUploadToken(bucket: string): string {
  const mac = getMac();
  const options = {
    scope: bucket,
    expires: 7200,
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  return putPolicy.uploadToken(mac);
}

export async function POST(req: Request) {
  try {
    // 验证环境变量
    if (
      !process.env.QINIU_ACCESS_KEY ||
      !process.env.QINIU_SECRET_KEY ||
      !process.env.QINIU_BUCKET_NAME ||
      !process.env.QINIU_DOMAIN
    ) {
      return NextResponse.json(
        { ok: false, error: "七牛云配置不完整" },
        { status: 500 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file)
      return NextResponse.json(
        { ok: false, error: "未检测到文件" },
        { status: 400 },
      );
    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json(
        { ok: false, error: "文件大小超过 5MB" },
        { status: 400 },
      );
    if (!ALLOWED_MIME_TYPES.includes(file.type))
      return NextResponse.json(
        { ok: false, error: "格式不支持" },
        { status: 403 },
      );

    // 3. 计算哈希去重
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const hashSum = crypto.createHash("sha256").update(buffer).digest("hex");
    const redisCacheKey = `upload:qiniu:image:${hashSum}`;

    const cachedUrl = await redis.get(redisCacheKey);
    if (cachedUrl) {
      return NextResponse.json({ ok: true, url: cachedUrl });
    }

    // 4. 准备上传
    const bucket = process.env.QINIU_BUCKET_NAME;
    const key = safeRename(file); // 你的重命名逻辑
    const token = createUploadToken(bucket);
    const config = new qiniu.conf.Config();
    // 可选：根据你的存储区域设置，例如 qiniu.zone.Zone_z0
    // config.zone = qiniu.zone.Zone_z0;

    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();

    // 5. 封装 Promise 执行上传
    const uploadResult = await new Promise<{ key: string }>(
      (resolve, reject) => {
        formUploader.put(
          token,
          key,
          buffer,
          putExtra,
          (respErr, respBody, respInfo) => {
            if (respErr) {
              reject(respErr);
            } else if (respInfo.statusCode === 200) {
              resolve(respBody);
            } else {
              reject(
                new Error(
                  `Qiniu Error: ${respInfo.statusCode} ${JSON.stringify(respBody)}`,
                ),
              );
            }
          },
        );
      },
    );

    // 6. 拼接最终 URL
    // 注意：不要依赖 resp.requestUrls，直接使用你的自定义域名
    const domain = process.env.QINIU_DOMAIN.replace(/\/$/, ""); // 去掉末尾斜杠
    const finalUrl = `${domain}/${uploadResult.key}`;

    // 存入 Redis
    await redis.set(redisCacheKey, finalUrl);

    return NextResponse.json({ ok: true, url: finalUrl });
  } catch (error: unknown) {
    console.error("上传流程出错:", error);
    return NextResponse.json(
      { ok: false, error: (error as Error).message || "服务器错误" },
      { status: 500 },
    );
  }
}
