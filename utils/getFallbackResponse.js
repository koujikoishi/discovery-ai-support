// utils/getFallbackResponse.js

export default function getFallbackResponse(message) {
  const lower = message.toLowerCase();

  // ラーメン・飲食系のワードに反応
  if (lower.includes("ラーメン") || lower.includes("カレー") || lower.includes("ランチ")) {
    return [
      "ラーメンのおすすめまでは分からないのですが、🍜",
      "もし飲食店やメニュー開発でユーザーの声を分析したい場合は、Discovery AIをご活用いただけるかもしれません！",
      "たとえば『ラーメンに関するSNSの声』を元に、好まれるトッピングや味の傾向などを可視化できます。",
      "",
      "ご興味があれば、どんなシーンでの活用をお考えか教えてください 😊",
    ].join("\n");
  }

  // 旅行・観光関連のワードに反応
  if (lower.includes("旅行") || lower.includes("京都") || lower.includes("温泉") || lower.includes("観光")) {
    return [
      "旅行って良いですよね！✈️",
      "ちなみにDiscovery AIでは、観光業の方向けに『訪問者の声』や『レビュー分析』を活かしたマーケティング支援も行えます。",
      "",
      "具体的な活用イメージがあれば、ぜひ教えてください 😊",
    ].join("\n");
  }

  // 汎用テンプレート
  return [
    "ちょっと意図を読み違えていたらごめんなさい 🙇",
    "もしAIやユーザー分析に関することであれば、Discovery AIがお力になれるかもしれません！",
    "",
    "どのようなことに関心がありますか？お気軽に教えてください。",
  ].join("\n");
}
