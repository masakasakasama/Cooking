// ----------------------------------------------------------------------------
// ドメイン型定義
// ----------------------------------------------------------------------------
// Ja = 日本語, De = ドイツ語。UI の言語トグルで表示を切り替える。
// ----------------------------------------------------------------------------

export type Lang = "ja" | "de";

export type RecipeStatus = "want" | "cooking" | "cooked" | "favorite";

export type Difficulty = "easy" | "medium" | "hard";

export interface Ingredient {
  id: string;
  nameJa: string;
  nameDe: string;
  amount: string;
  order: number;
}

export interface CookingStep {
  id: string;
  textJa: string;
  textDe: string;
  order: number;
}

export interface Recipe {
  id: string;
  titleJa: string;
  titleDe: string;
  sourceUrl: string;
  /** 200KB 以下に圧縮したサムネイル。sourceUrl がある場合は空でもよい。 */
  imageDataUrl: string;
  timeMinutes: number;
  difficulty: Difficulty;
  tags: string[];
  status: RecipeStatus;
  memo: string;
  // ingredients / steps は無料枠の read 数最小化のため recipe ドキュメントに埋め込む。
  ingredients: Ingredient[];
  steps: CookingStep[];
  createdAt: number;
  updatedAt: number;
}

export interface ShoppingItem {
  id: string;
  nameJa: string;
  nameDe: string;
  amount: string;
  checked: boolean;
  /** どのレシピ由来か（複数可） */
  recipeIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Preferences {
  favoriteIngredients: string[];
  dislikedIngredients: string[];
  forbiddenIngredients: string[];
  preferredGenres: string[];
  maxCookingTimeMinutes: number;
  updatedAt: number;
}

export interface DisplaySettings {
  lang: Lang;
  updatedAt: number;
}

export interface Recommendation {
  id: string;
  titleJa: string;
  titleDe: string;
  reasonJa: string;
  reasonDe: string;
  recipeId?: string;
}

export interface SpaceMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  memberUids: string[];
}

// ----------------------------------------------------------------------------
// 同期ステータス
// ----------------------------------------------------------------------------
export type SyncState =
  | "local" // Firebase 未設定 = ローカルモード
  | "connecting" // 認証/接続中
  | "syncing" // 書き込みが保留中
  | "synced" // クラウドと同期済み
  | "offline" // ネットワーク断（最後のデータを表示）
  | "error";

export interface SyncStatus {
  state: SyncState;
  /** 保留中の書き込み数（Firestore の hasPendingWrites 由来） */
  pendingWrites: number;
  message?: string;
}

export const DEFAULT_PREFERENCES: Preferences = {
  favoriteIngredients: [],
  dislikedIngredients: [],
  forbiddenIngredients: [],
  preferredGenres: [],
  maxCookingTimeMinutes: 60,
  updatedAt: 0,
};

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  lang: "ja",
  updatedAt: 0,
};
