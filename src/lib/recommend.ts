import type { Preferences, Recipe, Recommendation } from "../types";

// ----------------------------------------------------------------------------
// 「今日のおすすめ」エンジン（MVP スタブ）
// ----------------------------------------------------------------------------
// AI 解析は MVP では使わない（API キーをフロントに置かない方針）。
// 代わりに、同期済みの recipes + preferences から決定論的にスコアリングする。
// 日付 + spaceId をシードにするため、同じ日・同じスペースなら複数デバイスで
// 同じおすすめが出る（= 別途 Firestore に保存しなくても実質同期される）。
// ----------------------------------------------------------------------------

// 文字列 -> 32bit ハッシュ（決定論的シャッフル用）
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function containsAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => n.trim() && lower.includes(n.trim().toLowerCase()));
}

function recipeText(r: Recipe): string {
  const ing = r.ingredients.map((i) => `${i.nameJa} ${i.nameDe}`).join(" ");
  return `${r.titleJa} ${r.titleDe} ${r.tags.join(" ")} ${ing}`;
}

/**
 * おすすめを最大 count 件返す。seed（日付など）でその日の並びを安定させる。
 */
export function computeRecommendations(
  recipes: Recipe[],
  prefs: Preferences,
  seed: string,
  count = 3,
): Recommendation[] {
  const scored = recipes
    .map((r) => {
      const text = recipeText(r);
      let score = 0;
      const reasons: { ja: string; de: string }[] = [];

      // NG 食材を含むものは除外
      if (containsAny(text, prefs.forbiddenIngredients)) {
        return { r, score: -Infinity, reasons };
      }
      // 苦手食材は減点
      if (containsAny(text, prefs.dislikedIngredients)) score -= 3;

      // 好きな食材は加点
      if (containsAny(text, prefs.favoriteIngredients)) {
        score += 4;
        reasons.push({ ja: "好きな食材が入っている", de: "Enthält Lieblingszutaten" });
      }
      // 好きなジャンル（タグ）一致
      if (prefs.preferredGenres.some((g) => r.tags.some((t) => t.toLowerCase() === g.toLowerCase()))) {
        score += 3;
        reasons.push({ ja: "好きなジャンル", de: "Lieblingsküche" });
      }
      // 時間制約内なら加点
      if (r.timeMinutes > 0 && r.timeMinutes <= prefs.maxCookingTimeMinutes) {
        score += 2;
        reasons.push({ ja: `${r.timeMinutes}分で作れる`, de: `In ${r.timeMinutes} Min.` });
      }
      // お気に入り / 作りたいを少し優遇
      if (r.status === "favorite") score += 2;
      if (r.status === "want") score += 1;

      // 日替わりのゆらぎ（決定論的）
      score += (hash(seed + r.id) % 100) / 100;

      if (reasons.length === 0) {
        reasons.push({ ja: "そろそろ作ってみては？", de: "Wie wäre es mal wieder damit?" });
      }
      return { r, score, reasons };
    })
    .filter((x) => x.score > -Infinity)
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

  return scored.map(({ r, reasons }) => ({
    id: `rec-${r.id}`,
    recipeId: r.id,
    titleJa: r.titleJa || r.titleDe,
    titleDe: r.titleDe || r.titleJa,
    reasonJa: reasons.map((x) => x.ja).join(" / "),
    reasonDe: reasons.map((x) => x.de).join(" / "),
  }));
}

/** 今日の日付ベースのシード（YYYY-MM-DD） */
export function todaySeed(spaceId: string): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  return `${spaceId}:${ymd}`;
}
