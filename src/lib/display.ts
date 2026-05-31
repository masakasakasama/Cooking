import type { Lang, RecipeStatus } from "../types";
import { t, type TranslateKey } from "../i18n";

// Ja/De フィールドから現在の言語の文字列を選ぶ（空なら他方にフォールバック）
export function pick(ja: string, de: string, lang: Lang): string {
  if (lang === "ja") return ja || de;
  return de || ja;
}

const STATUS_KEY: Record<RecipeStatus, TranslateKey> = {
  want: "statusWant",
  cooking: "statusCooking",
  cooked: "statusCooked",
  favorite: "statusFavorite",
};

export function statusLabel(status: RecipeStatus, lang: Lang): string {
  return t(STATUS_KEY[status], lang);
}

export const ALL_STATUSES: RecipeStatus[] = ["want", "cooking", "cooked", "favorite"];
