import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
console.log("📦 Express読み込み成功");

import { getRelevantAnswer } from "./utils/getRelevantAnswer.js";
import { classifyIntent } from "./utils/classifyIntent.js";
import { getRecommendationAnswer } from "./utils/getRecommendationAnswer.js";
import { extractTeamInfo } from "./utils/extractTeamInfo.js";
import getSmalltalkResponse from "./utils/getSmalltalkResponse.js";
import getFallbackResponse from "./utils/getFallbackResponse.js";
import { getSuggestedQuestions } from "./utils/getRelatedQuestions.js";
import {
  getContractTemplate,
  getPricingTemplate,
  getOnboardingTemplate,
  getCancelTemplate,
  getLayoutTestTemplate,
  getIndustryTemplate,
} from "./utils/faqTemplates.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use((req, res, next) => {
  console.log("📥 リクエスト受信:", req.method, req.url);
  next();
});

app.use(express.json());
app.use(
  cors({
    origin: "https://discovery-ai-support.vercel.app",
    credentials: true,
  })
);

app.post("/api/chat", async (req, res) => {
  console.log("[START] POST /api/chat 受信");

  const { message, history = [] } = req.body;
  console.log("📨 受信メッセージ:", message);

  try {
    if (message.includes("レイアウトテスト")) {
      const reply = getLayoutTestTemplate();
      return res.json({
        reply,
        updatedHistory: [...history, { role: "assistant", content: reply }],
        relatedQuestions: getSuggestedQuestions("pricing"),
      });
    }

    const skipReplyMessages = ["ありがとう", "了解", "助かります", "サンキュー", "thanks", "thank you"];
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
    if (introDone && lastIntent === "recommendation") {
      intent = "recommendation";
    } else if (isShort && introDone) {
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

    if (skipReplyMessages.includes(normalized)) {
      reply = "どういたしまして！他にも気になることがあれば、お気軽にどうぞ。";
      return res.json({ reply, updatedHistory, relatedQuestions: [] });
    }

    const alreadyRecommended = history.some(
      (h) => h.role === "assistant" && String(h.content).includes("Starterプランをご提案")
    );
    if (intent === "recommendation" && alreadyRecommended) {
      reply = "他にも気になる点があればお知らせください。";
      return res.json({ reply, updatedHistory, relatedQuestions: [] });
    }

    if (intent === "recommendation" && introDone && isShort) {
      reply = "ありがとうございます。それでは、チームのご利用人数を教えていただけますか？";
      updatedHistory.push({ role: "assistant", content: reply });
      return res.json({ reply, updatedHistory, relatedQuestions: getSuggestedQuestions("recommendation") });
    }

    switch (intent) {
      case "smalltalk": {
        reply = getSmalltalkResponse(message);
        break;
      }

      case "faq":
      case "pricing": {
        console.log("🧠 getRelevantAnswer 呼び出し前");
        const output = await getRelevantAnswer(message, updatedHistory);
        console.log("💬 getRelevantAnswer 応答:", output);
        reply = output.answer;
        relatedQuestions = output.relatedQuestions;
        updatedHistory.push({ role: "system", content: `intent:${intent}` });
        break;
      }

      case "function": {
        const output = await getRelevantAnswer(message, updatedHistory, "function");
        console.log("💬 getRelevantAnswer 応答:", output);
        reply = output.answer;
        relatedQuestions = output.relatedQuestions;
        updatedHistory.push({ role: "system", content: `intent:function` });
        break;
      }

      case "recommendation": {
        if (!introDone) {
          reply =
            "ご利用目的に応じて最適なプランをご提案できます。いくつか質問させていただいてもよろしいですか？";
          updatedHistory.push({ role: "system", content: "recommendation-intro" });
          updatedHistory.push({ role: "system", content: "intent:recommendation" });
        } else {
          const extracted = await extractTeamInfo(message);
          console.log("🧠 extractTeamInfo 結果:", extracted);

          const lastTeam = history.find(
            (h) => h.role === "system" && h.content.startsWith("team:")
          )?.content?.split(":")[1] || null;
          const lastPurpose = history.find(
            (h) => h.role === "system" && h.content.startsWith("purpose:")
          )?.content?.split(":")[1] || null;

          const team = extracted?.teamSize || lastTeam;
          const purpose = extracted?.purpose || lastPurpose;

          if (!team && !purpose) {
            reply = [
              "恐れ入ります、以下のような形式でご回答いただけますか？",
              "・ご利用予定のチーム人数",
              "・主な利用目的（例：FAQ対応、社内ナレッジ、顧客サポート）",
            ].join("\n");
          } else if (team && !purpose) {
            reply =
              "ありがとうございます。あわせて主なご利用目的も教えていただけますか？（例：FAQ対応、社内ナレッジ、顧客サポートなど）";
            updatedHistory.push({ role: "system", content: `team:${team}` });
          } else if (!team && purpose) {
            reply =
              "ありがとうございます。あわせてチームのご利用人数も教えていただけますか？";
            updatedHistory.push({ role: "system", content: `purpose:${purpose}` });
          } else {
            updatedHistory.push({ role: "system", content: `team:${team}` });
            updatedHistory.push({ role: "system", content: `purpose:${purpose}` });

            const output = await getRecommendationAnswer(team, purpose);
            console.log("💡 getRecommendationAnswer 応答:", output);
            reply = typeof output === "object" && output.answer ? output.answer : String(output);

            return res.json({
              reply,
              updatedHistory,
              relatedQuestions: getSuggestedQuestions("recommendation"),
              teamSize: team || null,
              purpose: purpose || null,
            });
          }
        }

        relatedQuestions = getSuggestedQuestions("recommendation");
        break;
      }

      case "onboarding": {
        reply = [
          "サービスのご利用開始はとても簡単です！",
          "まずは以下のページからお申込みください。",
          "https://ai.elife.co.jp/plan",
          "",
          "💡 ご希望に応じてワークショップや初期設定支援も可能です。",
        ].join("\n");
        relatedQuestions = getSuggestedQuestions("onboarding");
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
        relatedQuestions = getSuggestedQuestions("cancel");
        break;
      }

      case "greeting": {
        reply = [
          "こんにちは！😊 Discovery AIへようこそ。",
          "どのようなことをお探しでしょうか？",
          "よくあるご質問もご参考になるかもしれません：",
        ].join("\n");
        relatedQuestions = getSuggestedQuestions("greeting");
        break;
      }

      case "difference": {
        const output = await getRelevantAnswer(message, updatedHistory, "difference");
        console.log("💬 getRelevantAnswer 応答:", output);
        reply = output.answer;
        relatedQuestions = output.relatedQuestions;
        updatedHistory.push({ role: "system", content: `intent:difference` });
        break;
      }

      case "other": {
        reply = getFallbackResponse(message);
        relatedQuestions = getSuggestedQuestions("other");
        break;
      }

      default: {
        reply = "ご質問の意図をもう少し詳しくお聞きしてもよろしいでしょうか？";
        relatedQuestions = getSuggestedQuestions("faq");
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
