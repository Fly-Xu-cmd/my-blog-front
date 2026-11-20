import { readFeedbackSettings } from "@/lib/feedback";
import ArticleFeedback from "./ArticleFeedback";
export default async function ArticleConversation(props: {
  resource: "post" | "note";
  contentId: number;
  title: string;
  path: string;
  cover?: string | null;
}) {
  let githubUrl = "";
  try {
    githubUrl = (await readFeedbackSettings()).githubUrl;
  } catch {
    /* Reading remains available during configuration failure. */
  }
  return <ArticleFeedback {...props} githubUrl={githubUrl} />;
}
