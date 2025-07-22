import dotenv from "dotenv";
dotenv.config();

const systemPrompt = `
あなたは入力文の意図を8つのカテゴリから1つだけ選んで分類するAIです。

# カテゴリ一覧
- faq: よくある質問（例：「支払い方法は？」「ログインできない」）
- pricing: 料金に関する質問（例：「いくら？」「無料ですか？」）
- onboarding: 初期導入や申込に関する質問（例：「どうやって始めるの？」「トライアルはあるの？」）
- recommendation: 提案や適合性を尋ねる質問（例：「おすすめは？」「どのプランが合う？」）
- cancel: 解約・キャンセルに関する質問（例：「キャンセルできますか？」「解約方法は？」）
- greeting: あいさつ（例：「こんにちは」「元気ですか？」）
- smalltalk: 雑談・独り言（例：「お腹すいた」「眠い」「疲れた」）
- other: 上記以外の質問

# 出力形式
カテゴリ名のみを小文字で1語だけ返してください（例："faq"）。
`;

const greetingPattern = /^(こんにちは|こんばん[はわ]|おはよう|はじめまして|やあ|hi|hello|元気ですか)/i;
const smalltalkKeywords = [
  "疲れた", "眠い", "お腹すいた", "やる気出ない", "暇", "ねむ", "つらい", "しんどい",
  "退屈", "さむい", "あつい", "天気", "雨", "晴れ", "眠たい", "ねみい", "腹減った", "孤独", "さびしい"
];
const nonBusinessPattern = /(ラーメン|焼肉|カレー|うどん|パンケーキ|居酒屋|旅行|観光|映画|アニメ|ゲーム|アーティスト|スポーツ|推し|天気|今日の気温)/i;

export async function classifyIntent(userInput) {
  const lowerInput = userInput.toLowerCase().trim();

  if (greetingPattern.test(userInput)) return "greeting";
  if (smalltalkKeywords.some((kw) => lowerInput.includes(kw))) return "smalltalk";
  if (nonBusinessPattern.test(userInput)) return "other";

  if (lowerInput.includes("おすすめ") || lowerInput.includes("どのプラン")) return "recommendation";
  if (lowerInput.includes("料金") || lowerInput.includes("いくら") || lowerInput.includes("価格")) return "pricing";
  if (lowerInput.includes("始め") || lowerInput.includes("導入") || lowerInput.includes("申込")) return "onboarding";
  if (lowerInput.includes("解約") || lowerInput.includes("キャンセル")) return "cancel";

  try {
    console.log("🧠 fetchでintent分類を呼び出し中...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput },
        ],
        temperature: 0,
      }),
    });

    const data = await response.json();
    const category = data.choices?.[0]?.message?.content?.trim().toLowerCase();

    const validCategories = [
      "faq", "pricing", "onboarding", "recommendation", "cancel", "greeting", "smalltalk", "other"
    ];
    return validCategories.includes(category) ? category : "other";

  } catch (err) {
    console.error("❌ fetch呼び出し失敗:", err.message || err);
    return "other";
  }
}
