import {
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_PREFERENCES,
  type DisplaySettings,
  type Preferences,
  type Recipe,
  type ShoppingItem,
  type SpaceMeta,
  type SyncStatus,
} from "../types";
import { Emitter } from "./emitter";
import type { Listener, SpaceStore } from "./store";

// ----------------------------------------------------------------------------
// LocalStore: Firebase 未設定時のフォールバック。
// localStorage に保存し、同一ブラウザの別タブとは BroadcastChannel で同期する。
// （別デバイス同期はクラウドモードのみ。ローカルモードでも UI は同じ。）
// ----------------------------------------------------------------------------

interface SpaceData {
  meta: SpaceMeta;
  recipes: Record<string, Recipe>;
  shoppingItems: Record<string, ShoppingItem>;
  preferences: Preferences;
  displaySettings: DisplaySettings;
}

const keyOf = (spaceId: string) => `cooking:space:${spaceId}`;

function emptyData(spaceId: string, name: string): SpaceData {
  const now = Date.now();
  return {
    meta: { id: spaceId, name, createdAt: now, updatedAt: now, memberUids: ["local"] },
    recipes: {},
    shoppingItems: {},
    preferences: { ...DEFAULT_PREFERENCES },
    displaySettings: { ...DEFAULT_DISPLAY_SETTINGS },
  };
}

export class LocalStore implements SpaceStore {
  readonly spaceId: string;
  readonly mode = "local" as const;

  private data: SpaceData;
  private channel: BroadcastChannel | null = null;

  private syncStatus = new Emitter<SyncStatus>({ state: "local", pendingWrites: 0 });
  private meta = new Emitter<SpaceMeta | null>(null);
  private recipes = new Emitter<Recipe[]>([]);
  private shoppingItems = new Emitter<ShoppingItem[]>([]);
  private preferences = new Emitter<Preferences>({ ...DEFAULT_PREFERENCES });
  private displaySettings = new Emitter<DisplaySettings>({ ...DEFAULT_DISPLAY_SETTINGS });

  constructor(spaceId: string, defaultName = "My Kitchen") {
    this.spaceId = spaceId;
    this.data = this.load(spaceId, defaultName);
    this.emitAll();

    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(keyOf(spaceId));
      this.channel.onmessage = () => {
        // 別タブが保存した = ストレージから読み直して反映
        this.data = this.load(spaceId, defaultName);
        this.emitAll();
      };
    }
  }

  private load(spaceId: string, defaultName: string): SpaceData {
    try {
      const raw = localStorage.getItem(keyOf(spaceId));
      if (raw) {
        const parsed = JSON.parse(raw) as SpaceData;
        // 後方互換のため欠損フィールドを補完
        parsed.recipes ||= {};
        parsed.shoppingItems ||= {};
        parsed.preferences ||= { ...DEFAULT_PREFERENCES };
        parsed.displaySettings ||= { ...DEFAULT_DISPLAY_SETTINGS };
        return parsed;
      }
    } catch (e) {
      console.warn("[localStore] 読み込みに失敗、初期化します", e);
    }
    const fresh = emptyData(spaceId, defaultName);
    this.persist(fresh, false);
    return fresh;
  }

  private persist(data: SpaceData, broadcast = true): void {
    try {
      localStorage.setItem(keyOf(this.spaceId), JSON.stringify(data));
    } catch (e) {
      console.error("[localStore] 保存に失敗（容量超過の可能性）", e);
      this.syncStatus.set({
        state: "error",
        pendingWrites: 0,
        message: "ローカル保存に失敗しました（容量上限の可能性）",
      });
      return;
    }
    if (broadcast) this.channel?.postMessage("changed");
  }

  private emitAll(): void {
    this.meta.set(this.data.meta);
    this.recipes.set(this.sortedRecipes());
    this.shoppingItems.set(this.sortedShopping());
    this.preferences.set(this.data.preferences);
    this.displaySettings.set(this.data.displaySettings);
  }

  private sortedRecipes(): Recipe[] {
    return Object.values(this.data.recipes).sort((a, b) => b.updatedAt - a.updatedAt);
  }
  private sortedShopping(): ShoppingItem[] {
    return Object.values(this.data.shoppingItems).sort((a, b) => a.createdAt - b.createdAt);
  }

  private commit(): void {
    this.data.meta.updatedAt = Date.now();
    this.persist(this.data);
    this.emitAll();
  }

  // --- 購読 ---
  onSyncStatus(cb: Listener<SyncStatus>) {
    return this.syncStatus.subscribe(cb);
  }
  onMeta(cb: Listener<SpaceMeta | null>) {
    return this.meta.subscribe(cb);
  }
  onRecipes(cb: Listener<Recipe[]>) {
    return this.recipes.subscribe(cb);
  }
  onShoppingItems(cb: Listener<ShoppingItem[]>) {
    return this.shoppingItems.subscribe(cb);
  }
  onPreferences(cb: Listener<Preferences>) {
    return this.preferences.subscribe(cb);
  }
  onDisplaySettings(cb: Listener<DisplaySettings>) {
    return this.displaySettings.subscribe(cb);
  }

  // --- 変更 ---
  async upsertRecipe(recipe: Recipe): Promise<void> {
    this.data.recipes[recipe.id] = recipe;
    this.commit();
  }
  async deleteRecipe(id: string): Promise<void> {
    delete this.data.recipes[id];
    this.commit();
  }
  async upsertShoppingItem(item: ShoppingItem): Promise<void> {
    this.data.shoppingItems[item.id] = item;
    this.commit();
  }
  async deleteShoppingItem(id: string): Promise<void> {
    delete this.data.shoppingItems[id];
    this.commit();
  }
  async clearCheckedShoppingItems(): Promise<void> {
    for (const [id, item] of Object.entries(this.data.shoppingItems)) {
      if (item.checked) delete this.data.shoppingItems[id];
    }
    this.commit();
  }
  async savePreferences(prefs: Preferences): Promise<void> {
    this.data.preferences = { ...prefs, updatedAt: Date.now() };
    this.commit();
  }
  async saveDisplaySettings(settings: DisplaySettings): Promise<void> {
    this.data.displaySettings = { ...settings, updatedAt: Date.now() };
    this.commit();
  }
  async setSpaceName(name: string): Promise<void> {
    this.data.meta.name = name;
    this.commit();
  }

  dispose(): void {
    this.channel?.close();
    this.channel = null;
  }
}
