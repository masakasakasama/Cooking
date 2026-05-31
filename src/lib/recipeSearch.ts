import type { Recipe } from "../types";
import { newId } from "./id";

// ----------------------------------------------------------------------------
// レシピ検索（TheMealDB）
// ----------------------------------------------------------------------------
// 無料・APIキー不要・登録不要の公開レシピDB。
// 「有名どころのレシピを検索して、気に入ったものを自分たちのスペースに取り込む」用途。
// https://www.themealdb.com/api.php
//
// 注意: TheMealDB は英語中心。取り込み時は原文（英語）を Ja/De 両フィールドに入れ、
// ユーザーが後から編集できるようにする（翻訳は将来対応）。
// ----------------------------------------------------------------------------

const BASE = "https://www.themealdb.com/api/json/v1/1";

export interface SearchResult {
  externalId: string; // TheMealDB の idMeal
  title: string;
  thumb: string; // 画像URL
  category: string;
  area: string; // 料理の地域（Japanese 等）
  raw: MealDbMeal;
}

interface MealDbMeal {
  idMeal: string;
  strMeal: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strMealThumb?: string;
  strTags?: string | null;
  strYoutube?: string | null;
  strSource?: string | null;
  [key: string]: string | null | undefined; // strIngredient1..20 / strMeasure1..20
}

interface MealDbResponse {
  meals: MealDbMeal[] | null;
}

function toResult(m: MealDbMeal): SearchResult {
  return {
    externalId: m.idMeal,
    title: m.strMeal,
    thumb: m.strMealThumb ?? "",
    category: m.strCategory ?? "",
    area: m.strArea ?? "",
    raw: m,
  };
}

/** 名前でレシピ検索。空クエリならランダムに数件返す。 */
export async function searchRecipes(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) {
    // 空のときは「おすすめ」としてランダムを数件
    const picks = await Promise.all([randomMeal(), randomMeal(), randomMeal(), randomMeal()]);
    const seen = new Set<string>();
    return picks
      .filter((m): m is MealDbMeal => Boolean(m))
      .filter((m) => (seen.has(m.idMeal) ? false : (seen.add(m.idMeal), true)))
      .map(toResult);
  }
  const res = await fetch(`${BASE}/search.php?s=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`検索に失敗しました (${res.status})`);
  const data = (await res.json()) as MealDbResponse;
  return (data.meals ?? []).map(toResult);
}

/**
 * 好み設定に基づくおすすめを取得する（学習・検索の前に出す初期表示用）。
 * - 好きな食材があればそれで検索（ヒットしたものを優先）
 * - 足りなければランダムで補う
 * - NG/苦手食材を含む候補は除外
 * 失敗してもランダムにフォールバックして必ず数件返す。
 */
export async function recommendRecipes(opts: {
  favorite?: string[];
  disliked?: string[];
  forbidden?: string[];
  count?: number;
}): Promise<SearchResult[]> {
  const count = opts.count ?? 6;
  const favorite = (opts.favorite ?? []).filter(Boolean);
  const block = [...(opts.disliked ?? []), ...(opts.forbidden ?? [])]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const collected = new Map<string, SearchResult>();

  const blocked = (m: MealDbMeal): boolean => {
    const hay = JSON.stringify(m).toLowerCase();
    return block.some((b) => hay.includes(b));
  };

  // 1) 好きな食材で検索（最大2語ぶん）
  try {
    for (const ing of favorite.slice(0, 2)) {
      const res = await fetch(`${BASE}/filter.php?i=${encodeURIComponent(ing.trim())}`);
      if (!res.ok) continue;
      const data = (await res.json()) as MealDbResponse;
      for (const m of data.meals ?? []) {
        if (collected.size >= count) break;
        if (!collected.has(m.idMeal)) collected.set(m.idMeal, toResult(m));
      }
    }
  } catch {
    /* ネットワーク失敗は無視してランダムで補う */
  }

  // 2) 足りない分はランダムで補完（NG/苦手は除外）
  let guard = 0;
  while (collected.size < count && guard < count * 3) {
    guard++;
    const m = await randomMeal();
    if (!m) break;
    if (blocked(m)) continue;
    if (!collected.has(m.idMeal)) collected.set(m.idMeal, toResult(m));
  }

  return [...collected.values()].slice(0, count);
}

async function randomMeal(): Promise<MealDbMeal | null> {
  try {
    const res = await fetch(`${BASE}/random.php`);
    if (!res.ok) return null;
    const data = (await res.json()) as MealDbResponse;
    return data.meals?.[0] ?? null;
  } catch {
    return null;
  }
}

/** カテゴリ一覧（チップ表示用）。失敗しても空配列で握りつぶす。 */
export async function listCategories(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE}/list.php?c=list`);
    if (!res.ok) return [];
    const data = (await res.json()) as { meals: { strCategory: string }[] | null };
    return (data.meals ?? []).map((x) => x.strCategory);
  } catch {
    return [];
  }
}

/** カテゴリで絞り込み（簡易情報のみ返るので raw は最小限） */
export async function searchByCategory(category: string): Promise<SearchResult[]> {
  const res = await fetch(`${BASE}/filter.php?c=${encodeURIComponent(category)}`);
  if (!res.ok) throw new Error(`カテゴリ検索に失敗しました (${res.status})`);
  const data = (await res.json()) as MealDbResponse;
  // filter.php は idMeal/strMeal/strMealThumb のみ。詳細は取り込み時に lookup する。
  return (data.meals ?? []).map(toResult);
}

/** id から詳細を取得（filter 経由のカードを取り込む際に使用） */
export async function lookupMeal(id: string): Promise<MealDbMeal | null> {
  const res = await fetch(`${BASE}/lookup.php?i=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as MealDbResponse;
  return data.meals?.[0] ?? null;
}

/**
 * TheMealDB の meal を、このアプリの Recipe 型へ変換する。
 * 画像は URL をそのまま imageDataUrl に入れる（外部URLなので Firestore 容量を圧迫しない）。
 */
export function mealToRecipe(m: MealDbMeal): Recipe {
  const now = Date.now();

  // 材料: strIngredient1..20 + strMeasure1..20
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = (m[`strIngredient${i}`] ?? "").toString().trim();
    const measure = (m[`strMeasure${i}`] ?? "").toString().trim();
    if (!name) continue;
    ingredients.push({
      id: newId(),
      nameJa: name,
      nameDe: name,
      amount: measure,
      order: ingredients.length,
    });
  }

  // 手順: strInstructions を改行/ピリオドで段落分割
  const instructions = (m.strInstructions ?? "")
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const steps = instructions.map((text, idx) => ({
    id: newId(),
    textJa: text,
    textDe: text,
    order: idx,
  }));

  const tags: string[] = [];
  if (m.strCategory) tags.push(m.strCategory);
  if (m.strArea) tags.push(m.strArea);
  if (m.strTags) tags.push(...m.strTags.split(",").map((t) => t.trim()).filter(Boolean));

  return {
    id: newId(),
    titleJa: m.strMeal,
    titleDe: m.strMeal,
    sourceUrl: m.strSource || m.strYoutube || `https://www.themealdb.com/meal/${m.idMeal}`,
    imageDataUrl: m.strMealThumb ?? "",
    timeMinutes: 0,
    difficulty: "medium",
    tags: [...new Set(tags)],
    status: "want",
    memo: "",
    ingredients,
    steps,
    createdAt: now,
    updatedAt: now,
  };
}
