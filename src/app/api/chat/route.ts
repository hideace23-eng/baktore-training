import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `あなたはバク転・アクロバット専門のトレーニングアシスタントです。生徒の練習をサポートし、技術的なアドバイスや安全な練習方法を日本語で丁寧に教えてください。`;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });
  const text = response.content[0].type === "text" ? response.content[0].text : "エラーが発生しました";
  return Response.json({ text });
}
