import { admin, adminScope, body, endpoint, json } from "@/lib/api";
import { readSite, saveSite, siteFields } from "@/lib/site-settings";
export const GET = endpoint(async (req: Request) => {
  const isAdmin = await adminScope(req);
  const { revision, updatedAt, ...fields } = await readSite();
  return json({
    ok: true,
    data: isAdmin ? { ...fields, revision, updatedAt } : fields,
  });
});
export const PUT = endpoint(async (req: Request) => {
  await admin(req);
  const value = await body(req);
  const row = await saveSite(
    siteFields({ ...(await readSite()), ...value }),
    value.revision as number,
  );
  return json({
    ok: true,
    data: {
      ...siteFields(row.fields as Record<string, unknown>),
      revision: row.revision,
      updatedAt: row.updatedAt,
    },
  });
});
