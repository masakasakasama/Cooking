// ----------------------------------------------------------------------------
// ドメイン型定義
// ----------------------------------------------------------------------------
// Ja = 日本語, De = ドイツ語。UI の言語トグルで表示を切り替える。
// ----------------------------------------------------------------------------

export type Lang = "ja" | "de";

export type RecipeStatus = "want" | "cooking" | "cooked" | "favorite";

export type Difficulty = "easy" | "medium" | "hard";

// 献立の役割。主菜・副菜・汁物・ご飯もの・麺・デザート。
export type DishCategory = "main" | "side" | "soup" | "rice" | "noodle" | "dessert";

export const ALL_DISH_CATEGORIES: DishCategory[] = [
  "main",
  "side",
  "soup",
  "rice",
  "noodle",
  "dessert",
];

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

  // --- 追加メタ（任意。既存データとの後方互換のため optional）---
  /** 献立での役割（主菜/副菜/汁物など）。献立提案・分類に使う。 */
  category?: DishCategory;
  /** 旬の月（1-12）。未指定なら通年。おすすめの季節補正に使う。 */
  seasonMonths?: number[];
  /** 何人前か。分量スケーリングの基準。未指定なら 2 とみなす。 */
  servings?: number;
  /** 画像が無いときのサムネ代わりの絵文字。 */
  emoji?: string;
  /** 作った回数（自分用の人気順に使う）。 */
  cookedCount?: number;
  /** 最後に作った日時(ms)。 */
  lastCookedAt?: number;
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
  /** エラー時の Firebase エラーコード（切り分け用） */
  errorCode?: string;
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
