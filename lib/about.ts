import { cache } from "react";
import { prisma } from "./prisma";
import {
  defaultAbout,
  type AboutConfig,
  type AboutFields,
} from "./about-default";
import { ApiError } from "./api";

export async function readAbout(): Promise<AboutConfig> {
  const row = await prisma.aboutPage.findUnique({ where: { id: 1 } });
  return row
    ? {
        title: row.title,
        subtitle: row.subtitle,
        content: row.content,
        revision: row.revision,
        updatedAt: row.updatedAt,
      }
    : { ...defaultAbout, revision: 0, updatedAt: null };
}

// React cache deduplicates metadata/page reads within one render, without
// persisting content across requests after a management update.
export const aboutForPage = cache(readAbout);

export async function saveAbout(
  fields: AboutFields,
  revision: number,
): Promise<AboutConfig> {
  const conflict = () =>
    new ApiError(
      409,
      "ABOUT_VERSION_CONFLICT",
      "关于页已在其他窗口更新，请重新载入后再保存",
    );
  try {
    return await prisma.$transaction(async (tx) => {
      if (revision === 0) {
        const row = await tx.aboutPage.create({ data: { id: 1, ...fields } });
        return { ...fields, revision: row.revision, updatedAt: row.updatedAt };
      }
      // Keep the revision predicate in the UPDATE itself: Prisma/MySQL may
      // select matching IDs before updateMany, allowing two stale writers.
      const count = await tx.$executeRaw`
        UPDATE AboutPage SET title = ${fields.title}, subtitle = ${fields.subtitle},
          content = ${fields.content}, revision = revision + 1, updatedAt = NOW()
        WHERE id = 1 AND revision = ${revision}
      `;
      if (count !== 1) throw conflict();
      const row = await tx.aboutPage.findUniqueOrThrow({ where: { id: 1 } });
      return {
        title: row.title,
        subtitle: row.subtitle,
        content: row.content,
        revision: row.revision,
        updatedAt: row.updatedAt,
      };
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") throw conflict();
    throw error;
  }
}
