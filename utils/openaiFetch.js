import dotenv from "dotenv";
dotenv.config();

export async function fetchChatCompletion(messages, temperature = 0.4) {
  console.log("🚀 fetchChatCompletion(): 呼び出し開始");

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("❌ OPENAI_API_KEY が未定義です。");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      temperature
    })
  });

  console.log("📥 fetchChatCompletion(): 応答ステータス", res.status);

  if (!res.ok) {
    const errText = await res.text();
    console.error("❌ OpenAI API error:", res.status, errText);
    throw new Error(`OpenAI API fetch failed: ${res.status}`);
  }

  const data = await res.json();
  console.log("📦 fetchChatCompletion(): 応答取得完了");
  return data.choices[0].message.content;
}
