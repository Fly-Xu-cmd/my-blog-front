import ArticleFeedback from "./ArticleFeedback";
export default function ArticleConversation(props: {
  resource: "post" | "note";
  contentId: number;
  title: string;
  path: string;
  cover?: string | null;
}) {
  return <ArticleFeedback {...props} />;
}
