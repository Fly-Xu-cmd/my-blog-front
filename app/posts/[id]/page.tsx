// app/posts/[id]/page.js
import { posts } from "../../../data/posts";

export default function Post({ params }: { params: { id: string } }) {
  const { id } = params;
  const post = posts.find((p) => p.id.toString() === id);

  if (!post) {
    return <h1>文章未找到</h1>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <p className="text-sm text-gray-400">{post.date}</p>
      <div className="mt-6 text-lg leading-relaxed text-gray-800">
        {post.content}
      </div>
    </div>
  );
}
