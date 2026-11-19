import { admin, endpoint, json } from "@/lib/api";

// Retired compatibility endpoint: authenticate without parsing files or accessing disk.
export const POST = endpoint(async (req: Request) => {
  await admin(req);
  return json(
    {
      ok: false,
      code: "LOCAL_UPLOAD_RETIRED",
      error: "本地上传已停用，请使用七牛上传接口",
    },
    410,
  );
});
