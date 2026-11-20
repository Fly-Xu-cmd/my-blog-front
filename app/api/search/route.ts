import { adminScope, endpoint, json } from "@/lib/api";
import { searchContent } from "@/lib/search";
export const GET = endpoint(async (req: Request) => {
  await adminScope(req);
  return json(await searchContent(new URL(req.url).searchParams));
});
