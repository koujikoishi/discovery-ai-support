// utils/getRecommendationAnswer.js

export function getRecommendationAnswer(teamLine, purposeLine) {
  // 数字を抽出してチーム人数を判定
  const numberMatch = teamLine.match(/\d+/);
  const teamNumber = numberMatch ? parseInt(numberMatch[0], 10) : null;

  let teamSize = "large"; // デフォルトは large

  if (teamNumber !== null) {
    if (teamNumber <= 5) {
      teamSize = "small";
    } else if (teamNumber <= 10) {
      teamSize = "medium";
    }
  }

  const purpose = purposeLine.toLowerCase();

  // 今後の拡張に備えて purpose による分岐も可能（今は未使用）
  // 例: if (purpose.includes("サポート")) { ... }

  if (teamSize === "small") {
    return [
      "Starterプランをご提案します。",
      "- マーケティング担当者～5名程度までのチーム向け",
      "- 対象ブランド（カテゴリ）数が1～3件程度",
      "- 必要最低限の機能でコストを抑えたい方におすすめです",
    ];
  }

  if (teamSize === "medium") {
    return [
      "Proプランをご提案します。",
      "- 顧客インサイト分析やVoC分析を重視するマーケティングチーム向け",
      "- ブランド数が3～5件程度",
      "- 分析結果やレポートをリアルタイムに共有可能です",
    ];
  }

  return [
    "Enterpriseプランをご提案します。",
    "- マーケティング、営業、カスタマーサポートなど複数部門での利用を想定",
    "- 高度な分析機能やカスタムレポート、専任サポートを希望する企業に最適です",
  ];
}
