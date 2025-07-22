import { fetchChatCompletion } from './openaiFetch.js';

export async function getFallbackClarification(userMessage) {
  const messages = [
    {
      role: 'system',
      content: `
ユーザーから以下の曖昧な質問がありました：

"{input}"

この質問の意図を推測し、「Discovery AI」に関する質問として考えられる選択肢を3つ、日本語で箇条書きで出力してください。

【制約】
- ジャンルは「Discovery AI」のFAQに関わる内容（料金プラン、導入方法、活用例、プラン選定など）に限定してください。
- スマートフォン、PC設定、一般的なIT知識などは対象外としてください。

【出力形式】
- 質問候補1
- 質問候補2
- 質問候補3

※箇条書きのみ。補足説明は不要です。
`.replace('{input}', userMessage),
    },
    {
      role: 'user',
      content: userMessage,
    },
  ];

  const response = await fetchChatCompletion(messages, 0.3);
  return response.split('\n').filter((line) => line.trim().startsWith('-'));
}
