import { fetchChatCompletion } from './openaiFetch.js';

export async function getRelatedQuestions(userMessage) {
  const messages = [
    {
      role: 'system',
      content: `
あなたはFAQチャットボットです。以下のユーザーの質問に関連する、よくある質問を3〜5個、簡潔な日本語で出力してください。

【出力形式】
- 質問1
- 質問2
- 質問3
（必要に応じて4〜5個）

※ 必ず「質問文のみ」を箇条書き形式で返してください。
`,
    },
    {
      role: 'user',
      content: userMessage,
    },
  ];

  const response = await fetchChatCompletion(messages, 0.5);
  return response.split('\n').filter((line) => line.trim().startsWith('-'));
}
