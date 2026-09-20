import { Router } from "express";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAuth } from "../middleware/auth.js";
import { takeToken } from "../lib/rateLimit.js";

const router = Router();

const SYSTEM_PROMPT = `You are an expert MSA (Modern Standard Arabic) text simplifier for dyslexic learners.
STRICT RULES — violating any makes your output invalid:
1. Preserve MSA grammatical correctness at all times. NEVER use any dialect. Every sentence must be grammatically valid فصحى.
2. FULLY diacritize (تشكيل) ALL output text. Every word must carry its harakat. NEVER return undiacritized Arabic.
3. Prefer regular root-pattern (صرف سالم) vocabulary. AVOID irregular/hamzated/doubled/rare roots UNLESS irregular-word recognition is explicitly requested.
4. Return STRICT JSON ONLY, matching the provided response schema exactly. No prose, no markdown fences. First character must be "{".`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    simplifiedText: { type: "string" },
    originalDifficultyLevel: { type: "number" },
    targetDifficultyLevel: { type: "number" },
    changedTerms: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          replacement: { type: "string" },
          reason: { type: "string" },
        },
        required: ["original", "replacement", "reason"],
      },
    },
  },
  required: ["simplifiedText", "originalDifficultyLevel", "targetDifficultyLevel", "changedTerms"],
};

const HAS_ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const HAS_HARAKAT = /[\u064B-\u0652\u0670]/;

let model = null;
function getModel() {
  if (model) return model;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, temperature: 0.3 },
  });
  return model;
}

async function withRetry(fn, maxRetries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini request timeout")), 20_000)),
      ]);
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
    }
  }
  throw lastErr;
}

function validateSchema(data) {
  if (
    typeof data?.simplifiedText !== "string" || !data.simplifiedText.trim() ||
    typeof data.originalDifficultyLevel !== "number" ||
    typeof data.targetDifficultyLevel !== "number" ||
    !Array.isArray(data.changedTerms)
  ) throw new Error("Model response failed schema validation");
  if (!HAS_HARAKAT.test(data.simplifiedText)) throw new Error("Model response is not fully diacritized");
  return data;
}

const simplifySchema = z.object({
  text: z.string().min(1).max(4000),
  targetLevel: z.number().min(1).max(10).default(1),
  allowIrregularFocus: z.boolean().default(false),
});

router.post("/simplify", requireAuth, async (req, res, next) => {
  try {
    if (!takeToken(req.user.id)) {
      return res.status(429).json({ error: "Rate limit exceeded. Please wait a moment before trying again." });
    }

    const parsed = simplifySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const { text, targetLevel, allowIrregularFocus } = parsed.data;

    if (!HAS_ARABIC.test(text)) {
      return res.status(422).json({ error: "Input text must contain Arabic script" });
    }

    const genModel = getModel();
    if (!genModel) {
      return res.status(503).json({ error: "AI simplification is not configured on this server (missing GEMINI_API_KEY)." });
    }

    const userPrompt =
      `Target difficulty level: ${targetLevel} (1 = easiest).\n` +
      `Irregular roots ${allowIrregularFocus ? "ARE the teaching focus" : "are NOT allowed"}.\n` +
      `Simplify this text:\n${text}`;

    const result = await withRetry(() => genModel.generateContent(userPrompt));
    const raw = result.response.text().trim().replace(/^```(?:json)?|```$/g, "");

    let parsedJson;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      const fix = await genModel.generateContent(
        `${userPrompt}\n\nYour last response was not valid JSON. Return only the JSON object, nothing else.`
      );
      parsedJson = JSON.parse(fix.response.text().trim().replace(/^```(?:json)?|```$/g, ""));
    }

    res.json(validateSchema(parsedJson));
  } catch (err) {
    if (err.message?.includes("schema") || err.message?.includes("diacritiz")) {
      return res.status(502).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
