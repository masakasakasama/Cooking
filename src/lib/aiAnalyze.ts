import type { Recipe } from "../types";
import { newId } from "./id";

// ----------------------------------------------------------------------------
// AI 画像解析クライアント（フロント側）
// ----------------------------------------------------------------------------
// 料理写真を Worker(/analyze) に送り、抽出されたレシピを受け取る。
// AI のАПIキーは Worker 側にあり、フロントには一切置かない。
// Worker URL は VITE_AI_WORKER_URL で設定。未設定なら AI 機能は無効。
// ----------------------------------------------------------------------------

const WORKER_URL = (import.meta.env.VITE_AI_WORKER_URL ?? "").trim();

export function isAiConfigured(): boolean {
  return WORKER_URL.length > 0;
}

interface ExtractedRecipe {
  titleJa: string;
  titleDe: string;
  ingredients: { nameJa: string; nameDe: string; amount: string }[];
  steps: { textJa: string; textDe: string }[];
  timeMinutes: number;
  tags: string[];
}

/**
 * 料理写真(dataURL)を解析して Recipe の部分データを返す。
 * 画像本体は imageDataUrl にそのまま保持（呼び出し側で圧縮済みのものを渡す）。
 */
export async function analyzeImageToRecipe(
  imageDataUrl: string,
  lang: "ja" | "de",
): Promise<Recipe> {
  if (!isAiConfigured()) {
    throw new Error("AI Worker URL (VITE_AI_WORKER_URL) が未設定です");
  }

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

  const now = Date.now();
  const ex = data.recipe;
  return {
    id: newId(),
    titleJa: ex.titleJa || "",
    titleDe: ex.titleDe || "",
    sourceUrl: "",
    imageDataUrl, // 解析した写真をそのままサムネイルに使う
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
