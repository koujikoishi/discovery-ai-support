import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
console.log("📦 Express読み込み成功");

import { getRelevantAnswer } from "./utils/getRelevantAnswer.js";
import { classifyIntent } from "./utils/classifyIntent.js";
import { getRecommendationAnswer } from "./utils/getRecommendationAnswer.js";
import getSmalltalkResponse from "./utils/getSmalltalkResponse.js";
import getFallbackResponse from "./utils/getFallbackResponse.js";
import {
  getContractTemplate,
  getPricingTemplate,
  getOnboardingTemplate,
  getCancelTemplate,
  getLayoutTestTemplate,
} from "./utils/faqTemplates.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use((req, res, next) => {
  console.log("📥 リクエスト受信:", req.method, req.url);
  next();
});

app.use(express.json()); // ← 追加！（Express 4.16以降ではこれでOK）
app.use(cors()); // ← これだけでOK（デフォルトで全オリジン許可）
app.post("/api/chat", async (req, res) => {
  console.log("[START] POST /api/chat 受信");

  const { message, history = [] } = req.body;
  console.log("📥 リクエスト受信: POST /api/chat");
  console.log("📨 受信メッセージ:", message);

  try {
    if (message.includes("レイアウトテスト")) {
      const reply = getLayoutTestTemplate();
      return res.json({
        reply,
        updatedHistory: [...history, { role: "assistant", content: reply }],
        relatedQuestions: [
          "料金プランの表示を確認したい",
          "契約条件も見せて",
          "レイアウト改善は可能？",
        ],
      });
    }

    const shortReplies = ["はい", "うん", "そうです", "ok", "いいえ", "no"];
    const normalized = message.trim().toLowerCase();
    const isShort = shortReplies.includes(normalized);

    const introDone = history.some(
      (h) => h.role === "system" && h.content === "recommendation-intro"
    );
    const lastIntentObj = [...history]
      .reverse()
      .find((h) => h.role === "system" && h.content.startsWith("intent:"));
    const lastIntent = lastIntentObj?.content?.split(":")[1] || null;

    let intent = "";
    if (isShort && (introDone || lastIntent === "recommendation")) {
      intent = "recommendation";
    } else {
      console.log("✅ ステップ1: intent分類前");
      intent = await classifyIntent(message);
      console.log("🧭️ intent分類結果:", intent);
    }

    const updatedHistory = [...history];
    let reply = "";
    let relatedQuestions = [];

    if (!intent || typeof intent !== "string") {
      reply = "申し訳ありません、ただいま応答ができません。";
      return res.json({ reply, updatedHistory, relatedQuestions: [] });
    }

    switch (intent) {
      case "smalltalk": {
        reply = getSmalltalkResponse(message);
        break;
      }
      case "faq":
      case "pricing": {
        console.log("🧠 getRelevantAnswer 呼び出し前"); // ← ★追加①
        const output = await getRelevantAnswer(message, updatedHistory);
        console.log("💬 getRelevantAnswer 応答:", output); // ← ★追加②
        reply = output.answer;
        relatedQuestions = output.relatedQuestions;
        updatedHistory.push({ role: "system", content: `intent:${intent}` });
        break;
      }
      case "recommendation": {
        if (!introDone) {
          reply =
            "ご利用目的に応じて最適なプランをご提案できます。いくつか質問させていただいてもよろしいですか？";
          updatedHistory.push({ role: "system", content: "recommendation-intro" });
          updatedHistory.push({ role: "system", content: "intent:recommendation" });
        } else {
          const lower = message.toLowerCase();
          const teamMatch = lower.match(/(\d+)\s*人|少人数|中規模|大規模/);
          const purposeMatch = lower.match(/faq|ナレッジ|顧客|カスタマー|社内|対応|サポート/);

          const teamLine = teamMatch ? teamMatch[0] : null;
          const purposeLine = purposeMatch ? purposeMatch[0] : null;

          if (!teamLine || !purposeLine) {
            reply = [
              "恐れ入ります、以下のような形式でご回答いただけますか？",
              "1. ご利用予定のチーム人数",
              "2. 主な利用目的（例：FAQ対応、社内ナレッジ、顧客サポート）",
            ].join("\n");
          } else {
            updatedHistory.push({ role: "system", content: `team:${teamLine}` });
            updatedHistory.push({ role: "system", content: `purpose:${purposeLine}` });

            const output = getRecommendationAnswer(teamLine, purposeLine);
            console.log("💡 getRecommendationAnswer 応答:", output); // ← ★追加③
            reply = Array.isArray(output) ? output.join("\n") : String(output);
          }
        }

        relatedQuestions = [
          "Discovery AIはどの業種で使われていますか？",
          "自社に合うプランを知りたい",
          "無料トライアルはありますか？",
        ];
        break;
      }
      case "onboarding": {
        reply = [
          "サービスのご利用開始はとても簡単です！",
          "まずは以下のページからお申込みください。",
          "https://ai.elife.co.jp/start",
        ].join("\n");
        relatedQuestions = [
          "導入にかかる期間はどのくらい？",
          "担当者との打ち合わせは必要？",
          "申込前に試せますか？",
        ];
        break;
      }
      case "cancel": {
        reply = [
          "ご解約のご希望ですね。",
          "",
          "以下のいずれかの方法でご対応可能です：",
          "- 管理画面から「契約内容の確認・変更」にアクセス",
          "- またはお問い合わせフォームより「解約希望」とご連絡ください",
          "",
          "※契約プランにより解約時の対応が異なる場合がございます",
        ].join("\n");
        relatedQuestions = [
          "最低契約期間はありますか？",
          "契約期間中の途中解約は可能？",
          "解約後のデータはどうなりますか？",
        ];
        break;
      }
      case "greeting": {
        reply = [
          "こんにちは！😊 Discovery AIへようこそ。",
          "どのようなことをお探しでしょうか？",
          "よくあるご質問もご参考になるかもしれません：",
        ].join("\n");
        relatedQuestions = [
          "Discovery AIの料金をおしえてください",
          "どうやって導入を始めればいいですか？",
          "どのプランが自分に合っていますか？",
          "解約はどうやってできますか？",
        ];
        break;
      }
      case "other": {
        reply = getFallbackResponse(message);
        relatedQuestions = [
          "Discovery AIでできることを知りたい",
          "どの業種に向いていますか？",
          "具体的な導入事例はありますか？",
        ];
        break;
      }
      default: {
        reply = "ご質問の意図をもう少し詳しくお聞きしてもよろしいでしょうか？";
        relatedQuestions = [
          "Discovery AIで何ができますか？",
          "料金プランはありますか？",
          "解約方法を教えてください",
        ];
        break;
      }
    }

    updatedHistory.push({ role: "assistant", content: reply });
    res.json({ reply, updatedHistory, relatedQuestions });
  } catch (error) {
    console.error("❌ サーバーエラー:", error);
    res.status(500).json({ error: "エラーが発生しました" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 サーバー起動: http://localhost:${PORT}`);
  console.log(`✅ /api/chat エンドポイント待機中`);
});