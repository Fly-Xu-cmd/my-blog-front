import { type Post } from "@/app/frontend/model";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Empty } from "antd";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
// api获取文章详情
const getPostBySlug = async (slug: string) => {
  const res = await fetch(`${baseUrl}/api/posts/${slug}`);
  return res.json();
};
// 格式化时间
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default async function Post({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const { ok, post }: { ok: boolean; post: Post | undefined } = await getPostBySlug(slug);

  if (!ok || !post) {
    return (
      <div className="flex justify-center items-center flex-1">
        <Empty />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <p className="text-sm text-gray-400">
        {post.category?.name} / {formatDate(post.createdAt)}
      </p>
      <p className="text-sm text-gray-400">
        {post.tags?.map((tag) => tag.name).join(" / ")}
      </p>
      <div className="mt-6 text-lg leading-relaxed text-gray-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
