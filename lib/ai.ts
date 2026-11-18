// --- AI 辅助函数开始 ---
export async function generateAITitle(content: string): Promise<string> {
  try {
    const inputSnippet = content.slice(0, 2000);
    const payload = {
      model: process.env.AI_MODEL_NAME || 'glm-4-flash',
      messages: [
        {
          role: 'system',
          content:
            '你是一位资深的前端、后端、全栈等技术博客主编。你的任务是根据文章内容或关键词生成吸引人、SEO友好的博客标题。',
        },
        {
          role: 'user',
          content: `请为以下文章内容或关键词生成一个博客标题。
          
要求：
1. 语言风格：通顺、专业、吸引人，适合前端、后端、全栈等技术博客。
2. 字数限制：严格控制在 50 字以内。
3. 格式：直接输出标题内容，不要包含任何额外说明。
4. SEO友好：包含相关关键词，有吸引力。
5. 避免使用夸张或误导性标题。

文章内容：
${inputSnippet}`,
        },
      ],
      max_tokens: 2048,
      temperature: 0.7,
      top_p: 0.8,
    };

    const response = await fetch(
      process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        method: 'POST',
        signal: AbortSignal.timeout(20000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_API_KEY || ''}`,
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('AI API Error (Title Generation):', data);
      return '';
    }
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('生成标题失败:', error);
    return '';
  }
}

export async function generateAISummary(content: string): Promise<string> {
  try {
    const contentSnippet = content.slice(0, 5000);
    const payload = {
      model: process.env.AI_MODEL_NAME || 'glm-4-flash',
      messages: [
        {
          role: 'system',
          content:
            '你是一位资深的前端、后端、全栈等技术博客主编。你的任务是阅读文章内容，并生成一段精炼、吸引人的摘要。',
        },
        {
          role: 'user',
          content: `请为以下文章生成摘要。
          
要求：
1. 语言风格：通顺、专业、口语化，适合作为博客导读。
2. 字数限制：严格控制在 200 字以内。
3. 格式：直接输出摘要内容，不要包含"好的"、"摘要如下"、"这篇文章讲了"等废话。

文章内容：
${contentSnippet}`,
        },
      ],
      max_tokens: 2048,
      temperature: 0.8,
      top_p: 0.7,
    };

    const response = await fetch(
      process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        method: 'POST',
        signal: AbortSignal.timeout(20000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_API_KEY || ''}`,
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('AI API Error (Summary Generation):', data);
      return '';
    }
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('生成摘要失败:', error);
    return '';
  }
}
// --- AI 辅助函数结束 ---
