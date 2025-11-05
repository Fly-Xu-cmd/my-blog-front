import PostDetail from "../components/PostDetail";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PostDetail slug={slug} />;
}
