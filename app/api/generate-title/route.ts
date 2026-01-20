import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. 获取前端传来的内容或关键词
    const { content, keywords } = await request.json();

    if (!content && !keywords) {
      return NextResponse.json(
        { error: "请提供文章内容或关键词" },
        { status: 400 },
      );
    }

    // 处理输入，截取前 2000 字（对于标题生成，不需要太多内容）
    const inputSnippet = content ? content.slice(0, 2000) : keywords;

    // 2. 构造适合标题生成的 Prompt
    const payload = {
      model: process.env.AI_MODEL_NAME || "glm-4-flash", // 使用与摘要相同的模型
      messages: [
        {
          role: "system", // 使用 system 角色定调
          content:
            "你是一位资深的前端、后端、全栈等技术博客主编。你的任务是根据文章内容或关键词生成吸引人、SEO友好的博客标题。",
        },
        {
          role: "user",
          content: `请为以下文章内容或关键词生成一个博客标题。
          
要求：
1. 语言风格：通顺、专业、吸引人，适合前端、后端、全栈等技术博客。
2. 字数限制：严格控制在 50 字以内。
3. 格式：直接输出标题内容，不要包含任何额外说明。
4. SEO友好：包含相关关键词，有吸引力。
5. 避免使用夸张或误导性标题。

${
  content
    ? `文章内容：
${inputSnippet}`
    : `关键词：
${inputSnippet}`
}`,
        },
      ],
      // 保留 thinking 模式（如果模型支持）
      // 注意：只有特定模型版本支持 thinking，如果报错请注释掉这块
      // thinking: {
      //   type: "enabled",
      // },
      max_tokens: 2048, // 标题不需要太多 tokens，100 足够
      temperature: 0.7, // 0.7 适合标题生成，既有创意又不会太离谱
      top_p: 0.8,
    };

    // 3. 发起请求
    const response = await fetch(
      process.env.AI_BASE_URL ||
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AI_API_KEY || ""}`, // 使用环境变量中的 API Key
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("AI API Error (Title Generation):", data);
      return NextResponse.json(
        { error: data.error?.message || "生成标题失败" },
        { status: 500 },
      );
    }
    console.log("ai回复:", data.choices[0].message);

    // 4. 提取生成的标题
    const title = data.choices[0].message.content;

    return NextResponse.json({ title });
  } catch (error) {
    console.error("Server Error (Title Generation):", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
