import {
  admin,
  adminScope,
  ApiError,
  body,
  endpoint,
  json,
  textField,
} from "@/lib/api";
import { readAbout, saveAbout } from "@/lib/about";

export const dynamic = "force-dynamic";

export const GET = endpoint(async (req: Request) => {
  const isAdmin = await adminScope(req);
  const config = await readAbout();
  const data = isAdmin
    ? config
    : {
        title: config.title,
        subtitle: config.subtitle,
        content: config.content,
      };
  return json({ ok: true, data });
});

export const PUT = endpoint(async (req: Request) => {
  await admin(req);
  const value = await body(req);
  const title = textField(value.title, 80, true)!;
  const subtitle = textField(value.subtitle, 240, true)!;
  textField(value.content, 100_000, true);
  const content = value.content as string;
  const revision = value.revision;
  if (
    typeof revision !== "number" ||
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    revision >= 2147483647
  )
    throw new ApiError(400, "INVALID_REVISION");
  return json({
    ok: true,
    data: await saveAbout({ title, subtitle, content }, revision),
  });
});
