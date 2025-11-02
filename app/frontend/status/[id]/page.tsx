import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Dynamic } from "@/app/frontend/model";
import { Empty } from "antd";
import MyEditorPreview from "@/components/MyEditorPreview";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const fetchAllDynamics = async (id: string) => {
  const res = await fetch(`${baseUrl}/api/dynamics/${id}`);
  return res.json();
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}/${month}/${day}`;
};

export default async function Status({ params }: { params: { id: string } }) {
  const { id } = await params;
  const { data } = await fetchAllDynamics(id);
  const post: Dynamic | null = data || null;

  if (!post) {
    return (
      <div className="w-full flex justify-center items-center">
        <Empty description="动态未找到"></Empty>
      </div>
    );
  }

  return (
    <div className="w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-4">{post.title || "暂无标题"}</h1>
      <p className="text-sm text-gray-400">
        {formatDate(post.createdAt || "暂无日期")}
      </p>
      <div className="mt-6 text-lg leading-relaxed text-gray-800">
        <MyEditorPreview source={post.content || "暂无内容"} />
      </div>
    </div>
  );
}
