import { admin, adminScope, body, endpoint, json } from "@/lib/api";
import {
  discussionUrl,
  readFeedbackSettings,
  saveFeedbackSettings,
} from "@/lib/feedback";
export const GET = endpoint(async (req: Request) => {
  const isAdmin = await adminScope(req);
  const data = await readFeedbackSettings();
  return json({
    ok: true,
    data: isAdmin ? data : { githubUrl: data.githubUrl },
  });
});
export const PUT = endpoint(async (req: Request) => {
  await admin(req);
  const value = await body(req);
  const previous = await readFeedbackSettings();
  return json({
    ok: true,
    data: await saveFeedbackSettings(
      value.githubUrl === undefined
        ? previous.githubUrl
        : discussionUrl(value.githubUrl),
      value.revision,
    ),
  });
});
