import { ChromaClient } from 'chromadb';
import { getRecommendationAnswer } from './getRecommendationAnswer.js';
import {
  getContractTemplate,
  getPricingTemplate,
  getOnboardingTemplate,
  getCancelTemplate,
} from './faqTemplates.js';
import { fetchChatCompletion } from './openaiFetch.js';

// intent分類の簡易ロジック
function switchIntentByMessage(input) {
  const lower = input.toLowerCase();
  if (lower.includes('料金') || lower.includes('値段') || lower.includes('費用')) return 'pricing';
  if (lower.includes('解約') || lower.includes('キャンセル')) return 'cancel';
  if (lower.includes('おすすめ') || lower.includes('最適') || lower.includes('プラン') || lower.includes('どれ') || lower.includes('迷って')) return 'recommendation';
  if (lower.includes('使い方') || lower.includes('導入') || lower.includes('始め方')) return 'onboarding';
  if (lower.includes('契約期間') || lower.includes('期間') || lower.includes('継続')) return 'contract';
  return 'faq';
}

const relatedQuestionsMap = {
  pricing: ["各プランの違いは？", "契約期間は？", "料金は月額ですか？"],
  cancel: ["解約の手続き方法は？", "解約後も使えますか？", "解約締切日は？"],
  onboarding: ["導入手順は？", "初期設定の流れは？", "サポート体制は？"],
  recommendation: ["どのプランがおすすめ？", "複数人で使えますか？", "予算内で最適なプランは？"],
  contract: ["契約期間は？", "自動更新されますか？", "最低契約期間はありますか？"],
  faq: ["使い方を教えて", "対応ブラウザは？", "問い合わせ先は？"],
};

export async function getRelevantAnswer(userMessage, history = []) {
  const client = new ChromaClient();
  const collection = await client.getOrCreateCollection({ name: 'faq-bot',embeddingFunction: null, });

  // ✅ OpenAI埋め込み取得（エラーハンドリングあり）
  const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: userMessage,
      model: "text-embedding-3-small",
    }),
  });

  if (!embeddingRes.ok) {
    const errorText = await embeddingRes.text();
    throw new Error(`Embedding取得失敗: ${embeddingRes.status} - ${errorText}`);
  }

  const embeddingJson = await embeddingRes.json();
  if (!embeddingJson.data || !embeddingJson.data[0]?.embedding) {
    throw new Error(`Embeddingの形式が不正: ${JSON.stringify(embeddingJson)}`);
  }

  const queryEmbedding = embeddingJson.data[0].embedding;

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: 3,
  });

  const documents = results?.documents?.flat() || [];

  let recentIntent = history.find((h) => h.role === 'system' && h.content.startsWith('intent:'))?.content.split(':')[1];
  if (!recentIntent) {
    recentIntent = switchIntentByMessage(userMessage);
  }

  const relatedQuestions = relatedQuestionsMap[recentIntent] || relatedQuestionsMap['faq'];

  // テンプレ即時返答
  switch (recentIntent) {
    case 'pricing':
      return { answer: getPricingTemplate(), relatedQuestions };
    case 'cancel':
      return { answer: getCancelTemplate(), relatedQuestions };
    case 'contract':
      return { answer: getContractTemplate(), relatedQuestions };
    case 'onboarding':
      return { answer: getOnboardingTemplate(), relatedQuestions };
    case 'recommendation': {
      const lowerInput = userMessage.toLowerCase();
      const hasTeamSize =
        /\d+人/.test(userMessage) || lowerInput.includes('少人数') || lowerInput.includes('大人数');
      const hasPurpose =
        lowerInput.includes('分析') ||
        lowerInput.includes('insight') ||
        lowerInput.includes('コスト') ||
        lowerInput.includes('顧客') ||
        lowerInput.includes('サポート') ||
        lowerInput.includes('社内') ||
        lowerInput.includes('faq') ||
        lowerInput.includes('カスタマー') ||
        lowerInput.includes('ナレッジ');

      if (!hasTeamSize || !hasPurpose) {
        return {
          answer: `ご希望のプランをご案内するために、以下の情報を教えてください：

- チーム人数（例：1人、3〜5人、10人以上 など）
- 利用目的（例：コストを抑えたい、顧客インサイトを深掘りしたい など）

お手数ですが、もう少し詳しく教えていただけますか？`,
          relatedQuestions,
        };
      }

      const recommendation = await getRecommendationAnswer(userMessage, userMessage);
      return { answer: recommendation, relatedQuestions };
    }
  }

  if (documents.length === 0) {
    return {
      answer: '申し訳ありません。該当する回答が見つかりませんでした。ご質問の意図をもう少し詳しく教えていただけますか？',
      relatedQuestions,
    };
  }

  const contextText = documents.map((doc, i) => `【文書${i + 1}】\n${doc}`).join('\n\n');
  const formattedHistory = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => `【${m.role === 'user' ? 'ユーザー' : 'アシスタント'}】${m.content}`)
    .join('\n');

  const introLineMap = {
    faq: '以下の内容に基づいてご案内いたします。',
    pricing: '料金に関するご質問ですね。以下をご確認ください。',
    onboarding: 'ご利用開始に関するご案内です。',
    cancel: 'ご解約について、以下をご参照ください。',
    contract: '契約期間についてのご案内です。',
    greeting: 'ご質問ありがとうございます。よくある質問はこちらです：',
    other: '関連しそうな情報をもとにお答えします。',
  };

  const introLine = introLineMap[recentIntent] || introLineMap['faq'];

  const systemPrompt = `あなたはFAQチャットボットです。以下の制約条件に従って、FAQ文書の情報をもとにユーザーの質問に答えてください。

# 制約条件
- 回答はまず一文で要点を述べてください
- その後に箇条書きで詳しい内容を補足してください（必要があれば）
- Markdown形式で可読性を高めてください（例：改行、強調など）
- 回答が複数文書にまたがる場合は、自然に統合してください
- 回答が見つからない場合は「わかりません」とは言わず、質問の意図を尋ね返してください

# 回答トーン
${introLine}

# これまでの会話履歴
${formattedHistory}

# FAQ文書データ（最大3件）
${contextText}

# ユーザーからの質問
${userMessage}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  console.log("🧠 ChatCompletion 呼び出し直前");
  const reply = await fetchChatCompletion(messages, 0.4);
  console.log("💬 ChatCompletion 応答:", reply);
  
  return { answer: reply, relatedQuestions };
  
}
