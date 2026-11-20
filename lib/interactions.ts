import { prisma } from "./prisma";
import { redis } from "./redis";
import { ApiError } from "./api";
import { isValidVisitorId } from "./analytics";
export const interactionEvents = [
  "search",
  "search_empty",
  "search_click",
  "featured_click",
  "start_click",
  "series_click",
  "subscribe_click",
] as const;
export function interactionFields(value: Record<string, unknown>) {
  const { event, target, visitorId } = value;
  if (
    typeof event !== "string" ||
    !interactionEvents.includes(event as (typeof interactionEvents)[number]) ||
    typeof target !== "string" ||
    typeof visitorId !== "string" ||
    !isValidVisitorId(visitorId)
  )
    throw new ApiError(400, "INVALID_INTERACTION");
  const valid =
    event === "search" || event === "search_empty"
      ? ["all", "post", "TECH", "ESSAY"].includes(target)
      : event === "subscribe_click"
        ? target === "subscribe"
        : event === "series_click"
          ? /^series:[1-9]\d{0,9}$/.test(target)
          : event === "search_click"
            ? /^(post|note):[1-9]\d{0,9}$/.test(target)
            : /^post:[1-9]\d{0,9}$/.test(target);
  if (
    !valid ||
    (target.includes(":") && Number(target.split(":")[1]) > 2147483647)
  )
    throw new ApiError(400, "INVALID_INTERACTION");
  return { event, target, visitorId };
}
export function interactionDay(offset = 0) {
  const text = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(Date.parse(text + "T00:00:00Z") - offset * 86400000);
}
export async function recordInteraction(
  value: ReturnType<typeof interactionFields>,
) {
  const { event, target, visitorId } = value;
  if (target.includes(":")) {
    const [kind, id] = target.split(":");
    const available =
      kind === "series"
        ? await prisma.series.count({
            where: { id: Number(id), posts: { some: { published: true } } },
          })
        : kind === "post"
          ? await prisma.post.count({
              where: { id: Number(id), published: true },
            })
          : await prisma.note.count({
              where: { id: Number(id), published: true },
            });
    if (!available) throw new ApiError(400, "CONTENT_UNAVAILABLE");
  }
  let lock;
  try {
    lock = await redis.set(
      "interaction:dedup:" + visitorId + ":" + event + ":" + target,
      "1",
      "EX",
      2,
      "NX",
    );
  } catch {
    throw new ApiError(503, "ANALYTICS_UNAVAILABLE");
  }
  if (!lock) return;
  const day = interactionDay();
  await prisma.$executeRaw`INSERT INTO InteractionDaily(day,event,target,count) VALUES(${day},${event},${target},1) ON DUPLICATE KEY UPDATE count=count+1`;
}
