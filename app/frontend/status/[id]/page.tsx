import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Dynamic } from "@/app/frontend/model";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const fetchAllDynamics = async (id: string) => {
  const res = await fetch(`${baseUrl}/api/dynamics/${id}`);
  return res.json();
};

export default async function Status({ params }: { params: { id: string } }) {
  const { id } = await params;
  const data = await fetchAllDynamics(id);
  const post: Dynamic | null = data?.post || null;

  if (!post) {
    return <h1>动态未找到</h1>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-4">{post.title || "暂无标题"}</h1>
      <p className="text-sm text-gray-400">{post.createdAt || "暂无日期"}</p>
      <div className="mt-6 text-lg leading-relaxed text-gray-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content || "暂无内容"}
        </ReactMarkdown>
      </div>
    </div>
  );
}
