import {
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_PREFERENCES,
  type CookingStep,
  type Difficulty,
  type DisplaySettings,
  type Ingredient,
  type Lang,
  type Preferences,
  type Recipe,
  type RecipeStatus,
  type ShoppingItem,
  type SpaceMeta,
} from "../types";

// ----------------------------------------------------------------------------
// Firestore <-> ドメイン型 の変換。
// Firestore から来る値は any 相当なので、欠損や型ゆれに耐えるよう防御的に読む。
// ----------------------------------------------------------------------------

type AnyDoc = Record<string, unknown>;

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" ? v : fallback);
const bool = (v: unknown, fallback = false): boolean =>
  typeof v === "boolean" ? v : fallback;
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** undefined を除去したプレーンオブジェクトにする（Firestore は undefined を拒否する） */
export function toPlain<T>(obj: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj));
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const STATUSES: RecipeStatus[] = ["want", "cooking", "cooked", "favorite"];

function asDifficulty(v: unknown): Difficulty {
  return DIFFICULTIES.includes(v as Difficulty) ? (v as Difficulty) : "medium";
}
function asStatus(v: unknown): RecipeStatus {
  return STATUSES.includes(v as RecipeStatus) ? (v as RecipeStatus) : "want";
}

function ingredientFrom(v: unknown, idx: number): Ingredient {
  const o = (v ?? {}) as AnyDoc;
  return {
    id: str(o.id) || `i${idx}`,
    nameJa: str(o.nameJa),
    nameDe: str(o.nameDe),
    amount: str(o.amount),
    order: num(o.order, idx),
  };
}

function stepFrom(v: unknown, idx: number): CookingStep {
  const o = (v ?? {}) as AnyDoc;
  return {
    id: str(o.id) || `s${idx}`,
    textJa: str(o.textJa),
    textDe: str(o.textDe),
    order: num(o.order, idx),
  };
}

export function recipeFromDoc(id: string, data: AnyDoc): Recipe {
  const ingredients = Array.isArray(data.ingredients)
    ? data.ingredients.map(ingredientFrom).sort((a, b) => a.order - b.order)
    : [];
  const steps = Array.isArray(data.steps)
    ? data.steps.map(stepFrom).sort((a, b) => a.order - b.order)
    : [];
  return {
    id,
    titleJa: str(data.titleJa),
    titleDe: str(data.titleDe),
    sourceUrl: str(data.sourceUrl),
    imageDataUrl: str(data.imageDataUrl),
    timeMinutes: num(data.timeMinutes),
    difficulty: asDifficulty(data.difficulty),
    tags: strArr(data.tags),
    status: asStatus(data.status),
    memo: str(data.memo),
    ingredients,
    steps,
    createdAt: num(data.createdAt),
    updatedAt: num(data.updatedAt),
  };
}

export function shoppingItemFromDoc(id: string, data: AnyDoc): ShoppingItem {
  return {
    id,
    nameJa: str(data.nameJa),
    nameDe: str(data.nameDe),
    amount: str(data.amount),
    checked: bool(data.checked),
    recipeIds: strArr(data.recipeIds),
    createdAt: num(data.createdAt),
    updatedAt: num(data.updatedAt),
  };
}

export function preferencesFromDoc(data: AnyDoc): Preferences {
  return {
    favoriteIngredients: strArr(data.favoriteIngredients),
    dislikedIngredients: strArr(data.dislikedIngredients),
    forbiddenIngredients: strArr(data.forbiddenIngredients),
    preferredGenres: strArr(data.preferredGenres),
    maxCookingTimeMinutes: num(data.maxCookingTimeMinutes, DEFAULT_PREFERENCES.maxCookingTimeMinutes),
    updatedAt: num(data.updatedAt),
  };
}

export function displaySettingsFromDoc(data: AnyDoc): DisplaySettings {
  const lang = data.lang === "de" ? "de" : "ja";
  return {
    lang: lang as Lang,
    updatedAt: num(data.updatedAt, DEFAULT_DISPLAY_SETTINGS.updatedAt),
  };
}

export function spaceMetaFromDoc(id: string, data: AnyDoc): SpaceMeta {
  return {
    id,
    name: str(data.name, "My Kitchen"),
    createdAt: num(data.createdAt),
    updatedAt: num(data.updatedAt),
    memberUids: strArr(data.memberUids),
  };
}
