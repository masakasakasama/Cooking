import type { Recipe } from "../types";
import { newId } from "./id";

// ----------------------------------------------------------------------------
// AI 画像解析クライアント（フロント側）
// ----------------------------------------------------------------------------
// 2通りに対応する:
//  A) Worker 経由   : VITE_AI_WORKER_URL が設定されていれば、その Worker に投げる
//                     （APIキーは Worker 側にあり配布物に含まれない）
//  B) ユーザー自身のキー : ユーザーが自分の Gemini APIキーを入力した場合は、
//                     ブラウザから直接 Gemini を叩く。キーは localStorage にのみ保存し、
//                     Firestore にも配布コードにも含めない（= サーバー不要）。
//
// 「配布物に AI キーを埋め込まない」という当初方針は守りつつ、外部サーバーの
// デプロイ無しで AI を使えるようにするための B 方式。
// ----------------------------------------------------------------------------

const WORKER_URL = (import.meta.env.VITE_AI_WORKER_URL ?? "").trim();
const GEMINI_KEY_STORAGE = "cooking:geminiApiKey";
const GEMINI_MODEL_STORAGE = "cooking:geminiModel";
const DEFAULT_MODEL = "gemini-2.5-flash"; // 新しいモデルが出たら設定画面から変更可

export function getUserGeminiKey(): string {
  try {
    return (localStorage.getItem(GEMINI_KEY_STORAGE) ?? "").trim();
  } catch {
    return "";
  }
}

export function setUserGeminiKey(key: string): void {
  try {
    if (key.trim()) localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
    else localStorage.removeItem(GEMINI_KEY_STORAGE);
  } catch {
    /* noop */
  }
}

export function getUserGeminiModel(): string {
  try {
    return (localStorage.getItem(GEMINI_MODEL_STORAGE) ?? "").trim() || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export function setUserGeminiModel(model: string): void {
  try {
    if (model.trim()) localStorage.setItem(GEMINI_MODEL_STORAGE, model.trim());
    else localStorage.removeItem(GEMINI_MODEL_STORAGE);
  } catch {
    /* noop */
  }
}

/** Worker かユーザーキーのどちらかが使えるか */
export function isAiConfigured(): boolean {
  return WORKER_URL.length > 0 || getUserGeminiKey().length > 0;
}

interface ExtractedRecipe {
  titleJa: string;
  titleDe: string;
  ingredients: { nameJa: string; nameDe: string; amount: string }[];
  steps: { textJa: string; textDe: string }[];
  timeMinutes: number;
  tags: string[];
}

const PROMPT = `あなたは料理写真からレシピを推定する専門家です。
渡された料理の画像を分析し、日本語(ja)とドイツ語(de)の両方で、以下のJSONだけを返してください。
余計な説明やマークダウンは一切付けず、JSONオブジェクトのみを出力すること。
{
  "titleJa": "料理名(日本語)",
  "titleDe": "料理名(ドイツ語)",
  "ingredients": [{"nameJa":"材料名(日)","nameDe":"材料名(独)","amount":"分量"}],
  "steps": [{"textJa":"手順(日)","textDe":"手順(独)"}],
  "timeMinutes": 30,
  "tags": ["タグ"]
}
分量は一般的な目安で補ってよい。材料5〜12個、手順3〜8ステップ程度にまとめること。`;

function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  if (fenced) return fenced[1].trim();
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s >= 0 && e > s) return text.slice(s, e + 1);
  return text.trim();
}

/** A) Worker 経由で解析 */
async function viaWorker(imageDataUrl: string, lang: "ja" | "de"): Promise<ExtractedRecipe> {
  const res = await fetch(`${WORKER_URL.replace(/\/$/, "")}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl, lang }),
  });
  if (!res.ok) {
    let msg = `AI解析に失敗しました (${res.status})`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) msg = err.error;
    } catch {
      /* noop */
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as { recipe?: ExtractedRecipe; error?: string };
  if (!data.recipe) throw new Error(data.error || "AI応答が不正です");
  return data.recipe;
}

/** B) ユーザーの Gemini キーで直接解析 */
async function viaGemini(imageDataUrl: string): Promise<ExtractedRecipe> {
  const key = getUserGeminiKey();
  const model = getUserGeminiModel();
  const img = parseDataUrl(imageDataUrl);
  if (!img) throw new Error("画像の形式が不正です");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { parts: [{ text: PROMPT }, { inline_data: { mime_type: img.mime, data: img.base64 } }] },
      ],
      generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini APIエラー (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  try {
    return JSON.parse(extractJson(raw)) as ExtractedRecipe;
  } catch {
    throw new Error("AI応答の解析に失敗しました");
  }
}

/**
 * 料理写真(dataURL)を解析して Recipe を返す。
 * Worker があれば Worker、無ければユーザーの Gemini キーを使う。
 */
export async function analyzeImageToRecipe(
  imageDataUrl: string,
  lang: "ja" | "de",
): Promise<Recipe> {
  let ex: ExtractedRecipe;
  if (WORKER_URL) {
    ex = await viaWorker(imageDataUrl, lang);
  } else if (getUserGeminiKey()) {
    ex = await viaGemini(imageDataUrl);
  } else {
    throw new Error("AIが未設定です。「好み」タブで Gemini APIキーを設定してください");
  }

  const now = Date.now();
  return {
    id: newId(),
    titleJa: ex.titleJa || "",
    titleDe: ex.titleDe || "",
    sourceUrl: "",
    imageDataUrl,
    timeMinutes: Number(ex.timeMinutes) || 0,
    difficulty: "medium",
    tags: Array.isArray(ex.tags) ? ex.tags.filter((t) => typeof t === "string") : [],
    status: "want",
    memo: "",
    ingredients: (ex.ingredients ?? []).map((i, idx) => ({
      id: newId(),
      nameJa: i.nameJa ?? "",
      nameDe: i.nameDe ?? "",
      amount: i.amount ?? "",
      order: idx,
    })),
    steps: (ex.steps ?? []).map((s, idx) => ({
      id: newId(),
      textJa: s.textJa ?? "",
      textDe: s.textDe ?? "",
      order: idx,
    })),
    createdAt: now,
    updatedAt: now,
  };
}
