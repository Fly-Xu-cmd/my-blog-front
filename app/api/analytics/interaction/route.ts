import { ApiError, endpoint, json } from "@/lib/api";
import { rateLimit } from "@/lib/analytics-cache";
import { interactionFields, recordInteraction } from "@/lib/interactions";
import { getSiteUrl } from "@/lib/seo";
export const POST = endpoint(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin && origin !== getSiteUrl())
    throw new ApiError(403, "INVALID_ORIGIN");
  await rateLimit(req, "interaction");
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "JSON_REQUIRED");
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, "INVALID_JSON");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      if (size > 2048) {
        await reader.cancel();
        throw new ApiError(413, "BODY_TOO_LARGE");
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
  } catch {
    throw new ApiError(400, "INVALID_JSON");
  }
  await recordInteraction(interactionFields(value));
  return json({ ok: true });
});
