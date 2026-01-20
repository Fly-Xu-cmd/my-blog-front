import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. 获取前端传来的文章内容
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "请提供文章内容" }, { status: 400 });
    }

    // 截取前 5000 字，避免超长 (Flash 模型处理长文本能力很强，可以适当给多点)
    const contentSnippet = content.slice(0, 5000);

    // 2. 构造适合摘要生成的 Prompt
    const payload = {
      model: process.env.AI_MODEL_NAME || "glm-4-flash", // 建议使用正式版 glm-4-flash，稳定且免费。如果你有 4.7 的权限可改为 "glm-4.7-flash"
      messages: [
        {
          role: "system", // 使用 system 角色定调更稳
          content:
            "你是一位资深的前端、后端、全栈等技术博客主编。你的任务是阅读文章内容，并生成一段精炼、吸引人的摘要。",
        },
        {
          role: "user",
          content: `请为以下文章生成摘要。
          
要求：
1. 语言风格：通顺、专业、口语化，适合作为博客导读。
2. 字数限制：严格控制在 200 字以内。
3. 格式：直接输出摘要内容，不要包含"好的"、"摘要如下"、"这篇文章讲了"等废话。

文章内容：
${contentSnippet}`,
        },
      ],
      // 3. 保留你 curl 中的 thinking 模式 (如果模型支持)
      // 注意：只有特定模型版本支持 thinking，如果报错请注释掉这块
      // thinking: {
      //   type: "enabled",
      // },
      max_tokens: 2048, // 摘要不需要 65536 那么多，2048 足够了
      temperature: 0.8, // 0.8 比 1.0 更适合摘要，既有文采又不会胡编乱造
      top_p: 0.7,
    };

    // 4. 发起请求
    const response = await fetch(
      process.env.AI_BASE_URL ||
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AI_API_KEY || ""}`, // 记得在 .env.local| .env 配置 Key
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("AI API Error:", data);
      return NextResponse.json(
        { error: data.error?.message || "生成失败" },
        { status: 500 },
      );
    }

    // 5. 提取内容
    // 智谱的 thinking 模型可能会把思考过程放在 content 之前，最终结果仍在 content 中
    const summary = data.choices[0].message.content;

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("AI API Error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
