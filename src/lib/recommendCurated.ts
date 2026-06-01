import type { DishCategory, Preferences, Recipe } from "../types";
import { curatedRecipes } from "../data/curatedRecipes";

// ----------------------------------------------------------------------------
// 厳選レシピをベースにした「おすすめ」「献立」「食材から検索」エンジン
// ----------------------------------------------------------------------------
// 海外APIの代わりに、日本で作りやすい厳選レシピ(curatedRecipes)から、
// 好み・旬・日替わりゆらぎでスコアリングする。決定論的なので同じ日・同じ
// スペースなら複数デバイスで同じ結果になる。
// ----------------------------------------------------------------------------

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function recipeText(r: Recipe): string {
  const ing = r.ingredients.map((i) => `${i.nameJa} ${i.nameDe}`).join(" ");
  return `${r.titleJa} ${r.titleDe} ${r.tags.join(" ")} ${ing}`.toLowerCase();
}

function containsAny(hay: string, needles: string[]): boolean {
  return needles.some((n) => n.trim() && hay.includes(n.trim().toLowerCase()));
}

export interface ScoredRecipe {
  recipe: Recipe;
  score: number;
  reasonJa: string;
  reasonDe: string;
  inSeason: boolean;
}

function scoreRecipe(r: Recipe, prefs: Preferences, seed: string, month: number): ScoredRecipe | null {
  const text = recipeText(r);

  // NG食材は完全除外
  if (containsAny(text, prefs.forbiddenIngredients)) return null;

  let score = 0;
  const ja: string[] = [];
  const de: string[] = [];

  if (containsAny(text, prefs.dislikedIngredients)) score -= 5;

  if (containsAny(text, prefs.favoriteIngredients)) {
    score += 4;
    ja.push("好きな食材入り");
    de.push("mit Lieblingszutaten");
  }
  if (prefs.preferredGenres.some((g) => r.tags.some((tg) => tg.toLowerCase() === g.toLowerCase()))) {
    score += 3;
    ja.push("好きなジャンル");
    de.push("Lieblingsküche");
  }
  if (r.timeMinutes > 0 && prefs.maxCookingTimeMinutes > 0 && r.timeMinutes <= prefs.maxCookingTimeMinutes) {
    score += 2;
  }

  const inSeason = !!r.seasonMonths && r.seasonMonths.includes(month);
  if (inSeason) {
    score += 3;
    ja.push("今が旬");
    de.push("jetzt Saison");
  }

  // 日替わりゆらぎ（決定論的）
  score += (hash(seed + r.id) % 100) / 100;

  if (ja.length === 0) {
    ja.push("そろそろどう？");
    de.push("Wie wäre es damit?");
  }

  return { recipe: r, score, reasonJa: ja.join(" · "), reasonDe: de.join(" · "), inSeason };
}

/** 今日の日付シード（YYYY-MM-DD + spaceId）。同日・同スペースで同じ並び。 */
export function todaySeed(spaceId: string): string {
  const d = new Date();
  return `${spaceId}:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** 厳選レシピからおすすめを count 件返す。 */
export function recommendCurated(
  prefs: Preferences,
  seed: string,
  count = 12,
): ScoredRecipe[] {
  const month = new Date().getMonth() + 1;
  return curatedRecipes()
    .map((r) => scoreRecipe(r, prefs, seed, month))
    .filter((x): x is ScoredRecipe => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

export interface MenuPlan {
  main?: Recipe;
  side?: Recipe;
  soup?: Recipe;
}

/** 主菜・副菜・汁物を1品ずつ選ぶ献立。seed を変えると別の組み合わせ。 */
export function buildMenu(prefs: Preferences, seed: string): MenuPlan {
  const month = new Date().getMonth() + 1;
  const pickCat = (cat: DishCategory): Recipe | undefined => {
    const scored = curatedRecipes()
      .filter((r) => r.category === cat)
      .map((r) => scoreRecipe(r, prefs, seed, month))
      .filter((x): x is ScoredRecipe => x !== null)
      .sort((a, b) => b.score - a.score);
    return scored[0]?.recipe;
  };
  return { main: pickCat("main"), side: pickCat("side"), soup: pickCat("soup") };
}

export interface MatchResult {
  recipe: Recipe;
  have: string[];
  missing: string[];
  ratio: number;
}

/**
 * 手持ち食材から「作れる / あと少しで作れる」レシピを探す。
 * 調味料(塩・醤油など)は家にある前提で missing から除外する。
 */
const PANTRY_STAPLES = [
  "塩", "醤油", "砂糖", "みりん", "酒", "味噌", "酢", "油", "こしょう", "だし", "ごま",
  "salz", "sojasauce", "zucker", "mirin", "sake", "miso", "essig", "öl", "pfeffer", "dashi", "sesam",
];

function isStaple(nameJa: string, nameDe: string): boolean {
  const hay = `${nameJa} ${nameDe}`.toLowerCase();
  return PANTRY_STAPLES.some((s) => hay.includes(s));
}

// 主要食材の頭文字（"豚肉"→"豚ロース" のような部分一致を拾うため）
const PRIMARY_CHARS = "豚牛鶏鮭鯖魚卵米麺芋豆菜葱";

// 手持ち食材 query が材料 (nameJa/nameDe) を指しているかを判定する。
function ownsIngredient(query: string, nameJa: string, nameDe: string): boolean {
  const q = query.toLowerCase();
  if (!q) return false;
  const a = nameJa.toLowerCase();
  const d = nameDe.toLowerCase();
  if (a.includes(q) || d.includes(q) || q.includes(a) || (d && q.includes(d))) return true;
  // 連続2文字の共通部分（「玉ねぎ」「じゃがいも」等）
  for (let i = 0; i + 2 <= q.length; i++) {
    const sub = q.slice(i, i + 2);
    if (a.includes(sub) || d.includes(sub)) return true;
  }
  // 主要食材の頭文字一致（「豚肉」→「豚ロース薄切り」）
  for (const ch of q) {
    if (PRIMARY_CHARS.includes(ch) && a.includes(ch)) return true;
  }
  return false;
}

export function matchByIngredients(have: string[], prefs: Preferences): MatchResult[] {
  const norm = have.map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (norm.length === 0) return [];
  const month = new Date().getMonth() + 1;

  const results: MatchResult[] = [];
  for (const r of curatedRecipes()) {
    // NG食材は除外
    if (scoreRecipe(r, prefs, "match", month) === null) continue;

    const haveList: string[] = [];
    const missList: string[] = [];
    for (const ing of r.ingredients) {
      const owned = norm.some((h) => ownsIngredient(h, ing.nameJa, ing.nameDe));
      if (owned) {
        haveList.push(ing.nameJa);
      } else if (!isStaple(ing.nameJa, ing.nameDe)) {
        missList.push(ing.nameJa);
      }
    }
    // 手持ち食材を1つも使わないレシピは出さない
    if (haveList.length === 0) continue;
    const total = haveList.length + missList.length;
    results.push({
      recipe: r,
      have: haveList,
      missing: missList,
      ratio: total > 0 ? haveList.length / total : 0,
    });
  }

  // 作れる順（不足が少ない順）→ 使える手持ちが多い順
  return results.sort((a, b) => {
    if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length;
    return b.have.length - a.have.length;
  });
}
