import { cache } from "react";
import { prisma } from "./prisma";
import { ApiError, textField } from "./api";
import { defaultSite, type SiteFields } from "./site-default";

export function siteFields(value: Record<string, unknown>): SiteFields {
  const result = { ...defaultSite };
  for (const key of [
    "name",
    "author",
    "description",
    "homeTitle",
    "homeIntro",
  ] as const)
    result[key] = textField(
      value[key],
      key === "author" ? 40 : key === "name" || key === "homeTitle" ? 80 : 240,
      true,
    )!;
  for (const key of ["avatar", "github", "wechatQr", "qqQr"] as const) {
    const candidate = textField(value[key], 512, key === "avatar") ?? "";
    if (candidate && !validSiteUrl(candidate, key !== "github"))
      throw new ApiError(400, "INVALID_SITE_URL");
    result[key] = candidate;
  }
  result.email = textField(value.email, 160) ?? "";
  if (result.email && !/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(result.email))
    throw new ApiError(400, "INVALID_EMAIL");
  return result;
}
function validSiteUrl(value: string, image: boolean) {
  if (
    image &&
    /^\/imgs\/[a-zA-Z0-9/_.-]+$/.test(value) &&
    !value.includes("..") &&
    !value.includes("//")
  )
    return true;
  try {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export async function readSite() {
  const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  return row
    ? {
        ...siteFields(row.fields as Record<string, unknown>),
        revision: row.revision,
        updatedAt: row.updatedAt,
      }
    : { ...defaultSite, revision: 0, updatedAt: null };
}
export const siteForPage = cache(async (): Promise<SiteFields> => {
  try {
    return await readSite();
  } catch {
    console.error("Site settings unavailable");
    return { ...defaultSite, github: "", email: "", wechatQr: "", qqQr: "" };
  }
});
export async function saveSite(fields: SiteFields, revision: number) {
  if (!Number.isInteger(revision) || revision < 0 || revision >= 2147483647)
    throw new ApiError(400, "INVALID_REVISION");
  const conflict = () =>
    new ApiError(
      409,
      "SITE_VERSION_CONFLICT",
      "站点配置已更新，请重新载入后保存",
    );
  try {
    return await prisma.$transaction(async (tx) => {
      if (revision === 0)
        return tx.siteSettings.create({ data: { id: 1, fields } });
      const count =
        await tx.$executeRaw`UPDATE SiteSettings SET fields=${JSON.stringify(fields)}, revision=revision+1, updatedAt=NOW() WHERE id=1 AND revision=${revision}`;
      if (count !== 1) throw conflict();
      return tx.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") throw conflict();
    throw error;
  }
}
