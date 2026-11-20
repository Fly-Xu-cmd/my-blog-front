import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { prisma } from "./prisma";
import { redis } from "./redis";
import { ApiError, textField } from "./api";
export const defaultGithubDiscussion =
  "https://github.com/Fly-Xu-cmd/my-blog-front/issues";
export function discussionUrl(value: unknown) {
  const text = textField(value, 512) ?? "";
  if (!text) return "";
  try {
    const url = new URL(text);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(?:issues|discussions)(?:\/\d+)?\/?$/.test(
        url.pathname,
      )
    )
      throw new Error();
    return url.toString();
  } catch {
    throw new ApiError(
      400,
      "INVALID_DISCUSSION_URL",
      "请输入 GitHub Issues 或 Discussions 的 HTTPS 地址",
    );
  }
}
export async function readFeedbackSettings() {
  return (
    (await prisma.feedbackSettings.findUnique({ where: { id: 1 } })) ?? {
      id: 1,
      githubUrl: defaultGithubDiscussion,
      revision: 0,
      updatedAt: null,
    }
  );
}
export async function saveFeedbackSettings(
  githubUrl: string,
  revision: unknown,
) {
  if (
    typeof revision !== "number" ||
    !Number.isInteger(revision) ||
    revision < 0 ||
    revision >= 2147483647
  )
    throw new ApiError(400, "INVALID_REVISION");
  const conflict = () =>
    new ApiError(
      409,
      "FEEDBACK_SETTINGS_CONFLICT",
      "讨论入口已更新，请重新载入",
    );
  try {
    return await prisma.$transaction(async (tx) => {
      if (revision === 0)
        return tx.feedbackSettings.create({ data: { id: 1, githubUrl } });
      const changed = await tx.feedbackSettings.updateMany({
        where: { id: 1, revision },
        data: { githubUrl, revision: { increment: 1 } },
      });
      if (changed.count !== 1) throw conflict();
      return tx.feedbackSettings.findUniqueOrThrow({ where: { id: 1 } });
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw conflict();
    throw e;
  }
}
export async function feedbackLimit(req: Request) {
  const trust = process.env.TRUST_PROXY === "true",
    ip = trust ? req.headers.get("x-real-ip") : "untrusted";
  if (trust && (!ip || !isIP(ip)))
    throw new ApiError(503, "TRUSTED_IP_REQUIRED");
  const limit = Number(process.env.FEEDBACK_RATE_LIMIT ?? 5);
  if (!Number.isSafeInteger(limit) || limit < 1)
    throw new ApiError(503, "INVALID_RATE_CONFIG");
  // The key expires with the rate window. Raw IP addresses are not persisted in MySQL.
  const key = "feedback:rate:" + createHash("sha256").update(ip!).digest("hex");
  try {
    const [count, ttl] = (await redis.eval(
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],600) end; return {n,redis.call('TTL',KEYS[1])}",
      1,
      key,
    )) as [number, number];
    if (count > limit)
      throw new ApiError(429, "RATE_LIMITED", String(Math.max(ttl, 1)));
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(503, "FEEDBACK_UNAVAILABLE", "反馈暂不可用，请稍后重试");
  }
}
export async function feedbackBody(req: Request) {
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new ApiError(415, "JSON_REQUIRED");
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, "INVALID_JSON");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new ApiError(413, "FEEDBACK_TOO_LARGE");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(400, "INVALID_JSON");
  } finally {
    reader.releaseLock();
  }
}
