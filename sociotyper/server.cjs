var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use((0, import_cors.default)());
app.use(import_express.default.json({ limit: "50mb" }));
var mapModel = (model) => {
  if (!model) return "gemini-2.5-flash";
  if (model.includes("gemini-3.5-flash")) return "gemini-2.5-flash";
  if (model.includes("gemini-3.5-pro")) return "gemini-2.5-pro";
  return model;
};
var analysisSchema = {
  type: import_genai.Type.OBJECT,
  properties: {
    tim: {
      type: import_genai.Type.OBJECT,
      properties: {
        abbreviation: { type: import_genai.Type.STRING },
        name: { type: import_genai.Type.STRING }
      },
      required: ["abbreviation", "name"]
    },
    summary: { type: import_genai.Type.STRING },
    dichotomies: {
      type: import_genai.Type.ARRAY,
      items: {
        type: import_genai.Type.OBJECT,
        properties: {
          name: { type: import_genai.Type.STRING },
          result: { type: import_genai.Type.STRING },
          confidence: { type: import_genai.Type.NUMBER },
          justification_pole1: { type: import_genai.Type.STRING },
          justification_pole2: { type: import_genai.Type.STRING }
        },
        required: ["name", "result", "confidence", "justification_pole1", "justification_pole2"]
      }
    }
  },
  required: ["tim", "summary", "dichotomies"]
};
var chatSchema = {
  type: import_genai.Type.OBJECT,
  properties: {
    responseText: { type: import_genai.Type.STRING },
    suggestedQuestions: {
      type: import_genai.Type.ARRAY,
      items: { type: import_genai.Type.STRING }
    }
  },
  required: ["responseText", "suggestedQuestions"]
};
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { monologue, lockedDichotomies, chatHistory, lockedPsychosophy, audioData, apiKey, model } = req.body;
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      return res.status(400).json({ error: "API_KEY_MISSING", message: "API key is required. Please provide it in settings or environment." });
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey: keyToUse.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const targetModel = mapModel(model);
    const dichotomiesList = [
      "\u0420\u0430\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C / \u0418\u0440\u0440\u0430\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C",
      "\u042D\u043A\u0441\u0442\u0440\u0430\u0432\u0435\u0440\u0441\u0438\u044F / \u0418\u043D\u0442\u0440\u043E\u0432\u0435\u0440\u0441\u0438\u044F",
      "\u0421\u0435\u043D\u0441\u043E\u0440\u0438\u043A\u0430 / \u0418\u043D\u0442\u0443\u0438\u0446\u0438\u044F",
      "\u041B\u043E\u0433\u0438\u043A\u0430 / \u042D\u0442\u0438\u043A\u0430",
      "\u0421\u0442\u0430\u0442\u0438\u043A\u0430 / \u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430",
      "\u041F\u043E\u0437\u0438\u0442\u0438\u0432\u0438\u0437\u043C / \u041D\u0435\u0433\u0430\u0442\u0438\u0432\u0438\u0437\u043C",
      "\u041A\u0432\u0435\u0441\u0442\u0438\u043C\u043D\u043E\u0441\u0442\u044C / \u0414\u0435\u043A\u043B\u0430\u0442\u0438\u043C\u043D\u043E\u0441\u0442\u044C",
      "\u0422\u0430\u043A\u0442\u0438\u043A\u0430 / \u0421\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u044F",
      "\u041A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0442\u0438\u0432\u0438\u0437\u043C / \u042D\u043C\u043E\u0442\u0438\u0432\u0438\u0437\u043C",
      "\u041F\u0440\u043E\u0446\u0435\u0441\u0441 / \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 (\u041F\u0440\u0430\u0432\u044B\u0435 / \u041B\u0435\u0432\u044B\u0435)",
      "\u0423\u0441\u0442\u0443\u043F\u0447\u0438\u0432\u043E\u0441\u0442\u044C / \u0423\u043F\u0440\u044F\u043C\u0441\u0442\u0432\u043E",
      "\u0411\u0435\u0441\u043F\u0435\u0447\u043D\u043E\u0441\u0442\u044C / \u041F\u0440\u0435\u0434\u0443\u0441\u043C\u043E\u0442\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C",
      "\u0420\u0430\u0441\u0441\u0443\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C / \u0420\u0435\u0448\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C",
      "\u041E\u0431\u044A\u0435\u043A\u0442\u0438\u0432\u0438\u0437\u043C / \u0421\u0443\u0431\u044A\u0435\u043A\u0442\u0438\u0432\u0438\u0437\u043C (\u0412\u0435\u0441\u0435\u043B\u044B\u0435 / \u0421\u0435\u0440\u044C\u0435\u0437\u043D\u044B\u0435)",
      "\u0410\u0440\u0438\u0441\u0442\u043E\u043A\u0440\u0430\u0442\u0438\u044F / \u0414\u0435\u043C\u043E\u043A\u0440\u0430\u0442\u0438\u044F"
    ].map((d) => `- ${d}`).join("\n");
    const prompt = `\u0422\u044B \u2014 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u044D\u043A\u0441\u043F\u0435\u0440\u0442 \u043F\u043E \u0441\u043E\u0446\u0438\u043E\u043D\u0438\u043A\u0435.
\u041E\u0411\u042F\u0417\u0410\u0422\u0415\u041B\u042C\u041D\u041E \u0432\u0435\u0440\u043D\u0438 \u0422\u041E\u041B\u042C\u041A\u041E \u0432\u0430\u043B\u0438\u0434\u043D\u044B\u0439 JSON (\u0431\u0435\u0437 \u0440\u0430\u0437\u043C\u0435\u0442\u043A\u0438 markdown), \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0449\u0438\u0439 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0435 \u043F\u043E\u043B\u044F:
1. "tim": \u043E\u0431\u044A\u0435\u043A\u0442 \u0441 \u043F\u043E\u043B\u044F\u043C\u0438 "abbreviation" (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, "\u0418\u041B\u042D") \u0438 "name" (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, "\u0418\u041B\u042D (\u0414\u043E\u043D \u041A\u0438\u0445\u043E\u0442)")
2. "summary": "\u0422\u0435\u043A\u0441\u0442\u043E\u0432\u043E\u0435 \u0440\u0435\u0437\u044E\u043C\u0435 \u0430\u043D\u0430\u043B\u0438\u0437\u0430..."
3. "dichotomies": \u043C\u0430\u0441\u0441\u0438\u0432 \u0438\u0437 15 \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432, \u043A\u0430\u0436\u0434\u044B\u0439 \u0438\u0437 \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 \u041E\u0414\u041D\u0423 \u0438\u0437 15 \u0441\u043E\u0446\u0438\u043E\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u0434\u0438\u0445\u043E\u0442\u043E\u043C\u0438\u0439 (\u043F\u0440\u0438\u0437\u043D\u0430\u043A\u043E\u0432 \u0420\u0435\u0439\u043D\u0438\u043D\u0430). 

\u0421\u043F\u0438\u0441\u043E\u043A \u0432\u0441\u0435\u0445 15 \u0434\u0438\u0445\u043E\u0442\u043E\u043C\u0438\u0439, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0414\u041E\u041B\u0416\u041D\u042B \u0411\u042B\u0422\u042C \u0432 \u043C\u0430\u0441\u0441\u0438\u0432\u0435 dichotomies:
${dichotomiesList}

\u0424\u043E\u0440\u043C\u0430\u0442 \u043E\u0431\u044A\u0435\u043A\u0442\u0430 \u0434\u0438\u0445\u043E\u0442\u043E\u043C\u0438\u0438:
{
  "name": "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0434\u0438\u0445\u043E\u0442\u043E\u043C\u0438\u0438 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u042D\u043A\u0441\u0442\u0440\u0430\u0432\u0435\u0440\u0441\u0438\u044F / \u0418\u043D\u0442\u0440\u043E\u0432\u0435\u0440\u0441\u0438\u044F)",
  "result": "\u041F\u043E\u043B\u044E\u0441, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043F\u043E\u0431\u0435\u0434\u0438\u043B (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u042D\u043A\u0441\u0442\u0440\u0430\u0432\u0435\u0440\u0441\u0438\u044F)",
  "confidence": \u0447\u0438\u0441\u043B\u043E \u043E\u0442 0 \u0434\u043E 1 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, 0.85),
  "justification_pole1": "\u041F\u043E\u0447\u0435\u043C\u0443 \u044D\u0442\u043E \u043F\u043E\u0445\u043E\u0436\u0435 \u043D\u0430 \u043F\u043E\u043B\u044E\u0441 1...",
  "justification_pole2": "\u041F\u043E\u0447\u0435\u043C\u0443 \u044D\u0442\u043E \u043F\u043E\u0445\u043E\u0436\u0435 \u043D\u0430 \u043F\u043E\u043B\u044E\u0441 2..."
}

\u0412\u041D\u0418\u041C\u0410\u041D\u0418\u0415: \u041D\u0435\u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0441\u043E\u0446\u0438\u043E\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u043F\u0440\u0438\u0437\u043D\u0430\u043A\u0438 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u044B (\u0437\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u044B) \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u043C. \u0422\u044B \u041E\u0411\u042F\u0417\u0410\u041D \u043F\u043E\u0434\u043E\u0431\u0440\u0430\u0442\u044C \u0441\u043E\u0446\u0438\u043E\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0422\u0418\u041C \u0438 \u0432\u044B\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u0434\u0438\u0445\u043E\u0442\u043E\u043C\u0438\u0439 \u0442\u0430\u043A, \u0447\u0442\u043E\u0431\u044B \u043E\u043D\u0438 \u0421\u0422\u0420\u041E\u0413\u041E \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u043B\u0438 \u044D\u0442\u0438\u043C \u0437\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u043C \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F\u043C. \u041E\u0448\u0438\u0431\u043A\u0438 \u043D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B. \u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043F\u0440\u0438\u0437\u043D\u0430\u043A\u0438: ${JSON.stringify(lockedDichotomies || {})}
\u0415\u0441\u043B\u0438 \u0435\u0441\u0442\u044C \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u0447\u0430\u0442\u0430, \u0443\u0447\u0442\u0438 \u0435\u0435 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442: ${JSON.stringify(chatHistory || [])}

\u041F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439 \u044D\u0442\u043E\u0442 \u0442\u0435\u043A\u0441\u0442:
${monologue}`;
    let contents = prompt;
    if (audioData) {
      const audioArray = Array.isArray(audioData) ? audioData : [audioData];
      contents = [
        { text: prompt + "\n\n\u0410\u0423\u0414\u0418\u041E-\u0418\u041D\u0421\u0422\u0420\u0423\u041A\u0426\u0418\u042F (\u0415\u0441\u043B\u0438 \u043F\u0440\u0438\u043C\u0435\u043D\u0438\u043C\u043E): " + (audioArray[0].voicePrompt || "\u0410\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439 \u043D\u0435 \u0442\u043E\u043B\u044C\u043A\u043E \u0442\u0435\u043A\u0441\u0442, \u043D\u043E \u0438 \u0441\u0430\u043C \u0433\u043E\u043B\u043E\u0441, \u0438\u043D\u0442\u043E\u043D\u0430\u0446\u0438\u0438, \u0442\u0435\u043C\u043F, \u043F\u043B\u0430\u0432\u043D\u043E\u0441\u0442\u044C \u0440\u0435\u0447\u0438 \u0438 \u043F\u0430\u0443\u0437\u044B.") },
        ...audioArray.map((ad) => ({ inlineData: { data: ad.base64, mimeType: ad.mimeType } }))
      ];
    }
    const response = await ai.models.generateContent({
      model: targetModel,
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2
      }
    });
    res.json(JSON.parse(response.text || "{}"));
  } catch (error) {
    console.error("Gemini Analyze Error:", error);
    let errorMessage = error.message || "Failed to analyze monologue";
    if (errorMessage.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") || errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("401") || errorMessage.includes("403")) {
      errorMessage = "\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438 API. \u0423\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u0432\u044B \u0432\u0432\u0435\u043B\u0438 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u044B\u0439 API \u043A\u043B\u044E\u0447 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 (\u0438\u043B\u0438 \u043E\u043D \u0437\u0430\u0434\u0430\u043D \u0432 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0445 \u043E\u043A\u0440\u0443\u0436\u0435\u043D\u0438\u044F), \u0438 \u0447\u0442\u043E \u043E\u043D \u0438\u043C\u0435\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u0438.";
    }
    res.status(500).json({ error: error.name || "Error", message: errorMessage });
  }
});
app.post("/api/gemini/transcribe", async (req, res) => {
  try {
    const { base64Data, mimeType, apiKey } = req.body;
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      return res.status(400).json({ error: "API_KEY_MISSING", message: "API key is required." });
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey: keyToUse.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const audioPart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType || "audio/mpeg"
      }
    };
    const textPart = {
      text: "\u0422\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u0431\u0438\u0440\u0443\u0439 \u044D\u0442\u043E\u0442 \u0430\u0443\u0434\u0438\u043E\u0444\u0430\u0439\u043B \u0432 \u0440\u0443\u0441\u0441\u043A\u0438\u0439 \u0442\u0435\u043A\u0441\u0442. \u0412\u0435\u0440\u043D\u0438 \u0442\u043E\u043B\u044C\u043A\u043E \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u0431\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 \u0431\u0435\u0437 \u043A\u0430\u043A\u0438\u0445-\u043B\u0438\u0431\u043E \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0435\u0432."
    };
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [textPart, audioPart]
    });
    res.json({ text: response.text || "" });
  } catch (error) {
    console.error("Gemini Transcribe Error:", error);
    let errorMessage = error.message || "Failed to transcribe audio";
    if (errorMessage.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") || errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("401") || errorMessage.includes("403")) {
      errorMessage = "\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438 API. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C API \u043A\u043B\u044E\u0447\u0430.";
    }
    res.status(500).json({ error: error.name || "Error", message: errorMessage });
  }
});
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { historyOrQuestion, result, selectedTim, apiKey, model } = req.body;
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      return res.status(400).json({ error: "API_KEY_MISSING", message: "API key is required." });
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey: keyToUse.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const targetModel = mapModel(model);
    let chatContext = "";
    if (Array.isArray(historyOrQuestion)) {
      chatContext = historyOrQuestion.map((m) => `${m.role === "user" ? "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C" : "\u0410\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442"}: ${m.content}`).join("\n");
    } else {
      chatContext = `\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C: ${historyOrQuestion}`;
    }
    const prompt = `\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u0434\u0438\u0430\u043B\u043E\u0433\u0430 \u043F\u043E \u0442\u0438\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044E:
\u0415\u0433\u043E \u0422\u0418\u041C: ${selectedTim}.
\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0434\u0438\u0430\u043B\u043E\u0433\u0430:
${chatContext}

\u041E\u0411\u042F\u0417\u0410\u0422\u0415\u041B\u042C\u041D\u041E \u0432\u0435\u0440\u043D\u0438 \u0432\u0430\u043B\u0438\u0434\u043D\u044B\u0439 JSON \u0441 \u043F\u043E\u043B\u044F\u043C\u0438:
1. "responseText": "\u0442\u0432\u043E\u0439 \u043E\u0442\u0432\u0435\u0442"
2. "suggestedQuestions": \u043C\u0430\u0441\u0441\u0438\u0432 \u0441\u0442\u0440\u043E\u043A \u0441 3-4 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u043E\u0432\u0430\u043D\u043D\u044B\u043C\u0438 \u0432\u043E\u043F\u0440\u043E\u0441\u0430\u043C\u0438.
\u0412\u0435\u0440\u043D\u0438 \u0422\u041E\u041B\u042C\u041A\u041E JSON.`;
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: chatSchema,
        temperature: 0.7
      }
    });
    res.json(JSON.parse(response.text || "{}"));
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    let errorMessage = error.message || "Failed to generate chat response";
    if (errorMessage.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") || errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("401") || errorMessage.includes("403")) {
      errorMessage = "\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438 API. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C API \u043A\u043B\u044E\u0447\u0430.";
    }
    res.status(500).json({ error: error.name || "Error", message: errorMessage });
  }
});
app.post("/api/gemini/compatibility", async (req, res) => {
  try {
    const { name1, tim1, psycho1, name2, tim2, psycho2, relationContext, apiKey, model } = req.body;
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      return res.status(400).json({ error: "API_KEY_MISSING", message: "API key is required." });
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey: keyToUse.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const targetModel = mapModel(model);
    const prompt = `\u041F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439 \u0438\u043D\u0442\u0435\u0440\u0442\u0438\u043F\u043D\u044B\u0435 \u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u044F \u0432 \u0441\u043E\u0446\u0438\u043E\u043D\u0438\u043A\u0435 \u0438 \u043F\u0441\u0438\u0445\u043E\u0441\u043E\u0444\u0438\u0438 (\u0410\u0444\u0430\u043D\u0430\u0441\u044C\u0435\u0432\u0430) \u043C\u0435\u0436\u0434\u0443 \u0434\u0432\u0443\u043C\u044F \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430\u043C\u0438.
\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A 1: ${name1}, \u0422\u0418\u041C: ${tim1}, \u041F\u0441\u0438\u0445\u043E\u0441\u043E\u0444\u0438\u044F: ${psycho1}
\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A 2: ${name2}, \u0422\u0418\u041C: ${tim2}, \u041F\u0441\u0438\u0445\u043E\u0441\u043E\u0444\u0438\u044F: ${psycho2}
\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u0432\u0437\u0430\u0438\u043C\u043E\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F: ${relationContext || "\u0420\u043E\u043C\u0430\u043D\u0442\u0438\u043A\u0430 / \u0411\u0440\u0430\u043A"}

\u041E\u043F\u0438\u0448\u0438 \u0438\u0445 \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C \u0438\u043C\u0435\u043D\u043D\u043E \u0432 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u0435 "${relationContext || "\u0420\u043E\u043C\u0430\u043D\u0442\u0438\u043A\u0430 / \u0411\u0440\u0430\u043A"}", \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u044B\u0435 \u0441\u0438\u043B\u044C\u043D\u044B\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B \u0441\u043E\u044E\u0437\u0430 \u0438 \u043F\u043E\u0442\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0435 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u044B (\u043A\u0430\u043A \u043F\u043E \u0444\u0443\u043D\u043A\u0446\u0438\u044F\u043C \u0422\u0418\u041C\u0430, \u0442\u0430\u043A \u0438 \u043F\u043E \u0444\u0443\u043D\u043A\u0446\u0438\u044F\u043C \u041F\u0441\u0438\u0445\u043E\u0441\u043E\u0444\u0438\u0438). \u0414\u0430\u0439 \u043F\u0440\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0441\u043E\u0432\u0435\u0442\u044B \u0434\u043B\u044F \u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u044F \u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u0439 \u0432 \u044D\u0442\u043E\u0439 \u0441\u0444\u0435\u0440\u0435. \u0421\u0434\u0435\u043B\u0430\u0439 \u043E\u0442\u0432\u0435\u0442 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u043C, \u0441 \u043F\u043E\u0434\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430\u043C\u0438 \u0438 \u043A\u0440\u0430\u0441\u0438\u0432\u044B\u043C \u0444\u043E\u0440\u043C\u0430\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435\u043C.`;
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: prompt
    });
    res.json({ text: response.text || "\u0410\u043D\u0430\u043B\u0438\u0437 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F." });
  } catch (error) {
    console.error("Gemini Compatibility Error:", error);
    let errorMessage = error.message || "Failed to analyze compatibility";
    if (errorMessage.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") || errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("401") || errorMessage.includes("403")) {
      errorMessage = "\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438 API. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C API \u043A\u043B\u044E\u0447\u0430.";
    }
    res.status(500).json({ error: error.name || "Error", message: errorMessage });
  }
});
app.post("/api/gemini/motivation", async (req, res) => {
  try {
    const { name, tim, psychosophy, apiKey, model } = req.body;
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      return res.status(400).json({ error: "API_KEY_MISSING", message: "API key is required." });
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey: keyToUse.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const targetModel = mapModel(model);
    const prompt = `\u041F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439 \u0441\u0438\u043D\u0435\u0440\u0433\u0438\u044E \u0422\u0418\u041C\u0430 (${tim}) \u0438 \u041F\u0441\u0438\u0445\u043E\u0441\u043E\u0444\u0441\u043A\u043E\u0433\u043E \u0442\u0438\u043F\u0430 (${psychosophy}) \u0434\u043B\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u043F\u043E \u0438\u043C\u0435\u043D\u0438 ${name}.
\u041E\u043F\u0438\u0448\u0438 \u0438\u0445 "\u0421\u043E\u0432\u043C\u0435\u0441\u0442\u043D\u044B\u0439 \u0432\u0435\u043A\u0442\u043E\u0440 \u043C\u043E\u0442\u0438\u0432\u0430\u0446\u0438\u0438" - \u043A\u0430\u043A \u0441\u043E\u0446\u0438\u043E\u043D\u0438\u043A\u0430 \u0438 \u043F\u0441\u0438\u0445\u043E\u0441\u043E\u0444\u0438\u044F \u0434\u043E\u043F\u043E\u043B\u043D\u044F\u044E\u0442 \u0434\u0440\u0443\u0433 \u0434\u0440\u0443\u0433\u0430. 
\u0414\u0430\u0439 \u0442\u043E\u0447\u043D\u044B\u0435 \u0441\u043E\u0432\u0435\u0442\u044B \u043F\u043E \u0432\u044B\u0431\u043E\u0440\u0443 \u043A\u0430\u0440\u044C\u0435\u0440\u044B, \u0440\u0430\u0431\u043E\u0447\u0435\u043C\u0443 \u043E\u043A\u0440\u0443\u0436\u0435\u043D\u0438\u044E \u0438 \u0441\u043F\u043E\u0441\u043E\u0431\u0430\u043C \u0438\u0437\u0431\u0435\u0433\u0430\u0442\u044C \u0432\u044B\u0433\u043E\u0440\u0430\u043D\u0438\u044F.
\u0421\u0434\u0435\u043B\u0430\u0439 \u043E\u0442\u0432\u0435\u0442 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u043C, \u0441 \u043F\u043E\u0434\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430\u043C\u0438 \u0438 \u043A\u0440\u0430\u0441\u0438\u0432\u044B\u043C \u0444\u043E\u0440\u043C\u0430\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435\u043C.`;
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: prompt
    });
    res.json({ text: response.text || "\u0410\u043D\u0430\u043B\u0438\u0437 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F." });
  } catch (error) {
    console.error("Gemini Motivation Error:", error);
    let errorMessage = error.message || "Failed to analyze motivation";
    if (errorMessage.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") || errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("401") || errorMessage.includes("403")) {
      errorMessage = "\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438 API. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C API \u043A\u043B\u044E\u0447\u0430.";
    }
    res.status(500).json({ error: error.name || "Error", message: errorMessage });
  }
});
app.get("/api/umami/stats", async (req, res) => {
  try {
    const shareId = req.query.shareId;
    const websiteId = req.query.websiteId;
    if (!shareId && !process.env.UMAMI_API_KEY) {
      return res.status(400).json({ error: "Share ID or UMAMI_API_KEY is required" });
    }
    const headers = {
      "Content-Type": "application/json"
    };
    if (shareId) {
      const tokenRes = await fetch(`https://cloud.umami.is/api/share/${shareId}`);
      if (!tokenRes.ok) {
        return res.status(tokenRes.status).json({ error: "Failed to fetch share token" });
      }
      const tokenData = await tokenRes.json();
      if (tokenData.token) {
        headers["x-umami-share-token"] = tokenData.token;
      }
    } else if (process.env.UMAMI_API_KEY) {
      headers["Authorization"] = `Bearer ${process.env.UMAMI_API_KEY}`;
    }
    const now = Date.now();
    const startAt = now - 24 * 60 * 60 * 1e3 * 30;
    const statsRes = await fetch(
      `https://cloud.umami.is/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${now}`,
      { headers }
    );
    if (!statsRes.ok) {
      const err = await statsRes.text();
      return res.status(statsRes.status).json({ error: "Failed to fetch Umami stats: " + err });
    }
    const stats = await statsRes.json();
    res.json(stats);
  } catch (error) {
    const err = error;
    console.error(err.message || error);
    res.status(500).json({ error: err.message || "Unknown error" });
  }
});
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
});
//# sourceMappingURL=server.cjs.map
