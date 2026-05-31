import type {
  DisplaySettings,
  Preferences,
  Recipe,
  ShoppingItem,
  SpaceMeta,
  SyncStatus,
} from "../types";

export type Listener<T> = (value: T) => void;

// ----------------------------------------------------------------------------
// SpaceStore: 1つの共有スペースのデータ読み書き抽象。
// LocalStore (localStorage) と FirestoreStore (クラウド同期) が実装する。
// UI 側は実装の違いを意識せず同じ API を使う。
// ----------------------------------------------------------------------------
export interface SpaceStore {
  readonly spaceId: string;
  readonly mode: "local" | "cloud";

  // 購読（購読直後に現在値が1回流れる）
  onSyncStatus(cb: Listener<SyncStatus>): () => void;
  onMeta(cb: Listener<SpaceMeta | null>): () => void;
  onRecipes(cb: Listener<Recipe[]>): () => void;
  onShoppingItems(cb: Listener<ShoppingItem[]>): () => void;
  onPreferences(cb: Listener<Preferences>): () => void;
  onDisplaySettings(cb: Listener<DisplaySettings>): () => void;

  // 変更（オフライン時はキャッシュ/キューに積まれ、再接続で反映される）
  upsertRecipe(recipe: Recipe): Promise<void>;
  deleteRecipe(id: string): Promise<void>;

  upsertShoppingItem(item: ShoppingItem): Promise<void>;
  deleteShoppingItem(id: string): Promise<void>;
  clearCheckedShoppingItems(): Promise<void>;

  savePreferences(prefs: Preferences): Promise<void>;
  saveDisplaySettings(settings: DisplaySettings): Promise<void>;

  setSpaceName(name: string): Promise<void>;

  dispose(): void;
}
