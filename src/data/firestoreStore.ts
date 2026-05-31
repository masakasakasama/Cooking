import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  type Firestore,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
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
import {
  displaySettingsFromDoc,
  preferencesFromDoc,
  recipeFromDoc,
  shoppingItemFromDoc,
  spaceMetaFromDoc,
  toPlain,
} from "./firestoreMappers";

// ----------------------------------------------------------------------------
// FirestoreStore: クラウド同期実装。
// - onSnapshot でリアルタイム購読（複数デバイス自動反映）
// - persistentLocalCache によりオフライン時も最後のデータを表示
// - snapshot.metadata から「同期中 / 同期済み / オフライン」を判定
// ----------------------------------------------------------------------------

export class FirestoreStore implements SpaceStore {
  readonly spaceId: string;
  readonly mode = "cloud" as const;
  private db: Firestore;
  private uid: string;

  private unsubs: Array<() => void> = [];
  private online = typeof navigator === "undefined" ? true : navigator.onLine;
  private fromCache = true;
  private hasPending = false;

  private syncStatus = new Emitter<SyncStatus>({ state: "connecting", pendingWrites: 0 });
  private meta = new Emitter<SpaceMeta | null>(null);
  private recipes = new Emitter<Recipe[]>([]);
  private shoppingItems = new Emitter<ShoppingItem[]>([]);
  private preferences = new Emitter<Preferences>({ ...DEFAULT_PREFERENCES });
  private displaySettings = new Emitter<DisplaySettings>({ ...DEFAULT_DISPLAY_SETTINGS });

  constructor(db: Firestore, spaceId: string, uid: string, initialName?: string) {
    this.db = db;
    this.spaceId = spaceId;
    this.uid = uid;

    this.attachConnectivity();
    void this.ensureMembership(initialName).then(() => this.attachListeners());
  }

  // --- パス ---
  private spaceRef() {
    return doc(this.db, "spaces", this.spaceId);
  }
  private recipesCol() {
    return collection(this.db, "spaces", this.spaceId, "recipes");
  }
  private shoppingCol() {
    return collection(this.db, "spaces", this.spaceId, "shoppingItems");
  }
  private prefsRef() {
    return doc(this.db, "spaces", this.spaceId, "preferences", "main");
  }
  private settingsRef() {
    return doc(this.db, "spaces", this.spaceId, "settings", "main");
  }

  /**
   * memberUids に自分の uid を追加（無ければスペースを作成）。
   * setDoc(merge) なので、参加・作成どちらも 1 回の書き込みで済む。
   */
  private async ensureMembership(initialName?: string): Promise<void> {
    try {
      const base: Record<string, unknown> = {
        memberUids: arrayUnion(this.uid),
        updatedAt: Date.now(),
      };
      // 新規作成時のみ name / createdAt をセット（参加時は既存値を尊重）
      if (initialName !== undefined) {
        base.name = initialName;
        base.createdAt = Date.now();
      }
      await setDoc(this.spaceRef(), base, { merge: true });
    } catch (err) {
      console.error("[firestore] メンバー登録に失敗", err);
      this.syncStatus.set({
        state: "error",
        pendingWrites: 0,
        message: "スペースへの参加に失敗しました（権限/ネットワークを確認）",
      });
    }
  }

  private attachConnectivity(): void {
    if (typeof window === "undefined") return;
    const goOnline = () => {
      this.online = true;
      this.recomputeStatus();
    };
    const goOffline = () => {
      this.online = false;
      this.recomputeStatus();
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    this.unsubs.push(() => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    });
  }

  private recomputeStatus(): void {
    let state: SyncStatus["state"];
    if (!this.online) {
      state = "offline";
    } else if (this.hasPending) {
      state = "syncing";
    } else if (this.fromCache) {
      // オンラインだがまだサーバ確認が取れていない
      state = "connecting";
    } else {
      state = "synced";
    }
    this.syncStatus.set({
      state,
      pendingWrites: this.hasPending ? 1 : 0,
    });
  }

  private attachListeners(): void {
    const onErr = (label: string) => (err: unknown) => {
      console.error(`[firestore] ${label} 購読エラー`, err);
      this.syncStatus.set({ state: "error", pendingWrites: 0, message: String(err) });
    };

    // スペースのメタ情報
    this.unsubs.push(
      onSnapshot(
        this.spaceRef(),
        (snap) => {
          this.meta.set(snap.exists() ? spaceMetaFromDoc(this.spaceId, snap.data()) : null);
        },
        onErr("space"),
      ),
    );

    // レシピ（このリスナーの metadata を主たる同期状態の指標にする）
    this.unsubs.push(
      onSnapshot(
        query(this.recipesCol()),
        { includeMetadataChanges: true },
        (snap) => {
          this.fromCache = snap.metadata.fromCache;
          this.hasPending = snap.metadata.hasPendingWrites;
          this.recomputeStatus();
          const list = snap.docs.map((d) => recipeFromDoc(d.id, d.data()));
          list.sort((a, b) => b.updatedAt - a.updatedAt);
          this.recipes.set(list);
        },
        onErr("recipes"),
      ),
    );

    // 買い物リスト
    this.unsubs.push(
      onSnapshot(
        query(this.shoppingCol()),
        { includeMetadataChanges: true },
        (snap) => {
          if (snap.metadata.hasPendingWrites) this.hasPending = true;
          const list = snap.docs.map((d) => shoppingItemFromDoc(d.id, d.data()));
          list.sort((a, b) => a.createdAt - b.createdAt);
          this.shoppingItems.set(list);
        },
        onErr("shoppingItems"),
      ),
    );

    // 好み設定
    this.unsubs.push(
      onSnapshot(
        this.prefsRef(),
        (snap) => {
          this.preferences.set(
            snap.exists() ? preferencesFromDoc(snap.data()) : { ...DEFAULT_PREFERENCES },
          );
        },
        onErr("preferences"),
      ),
    );

    // 表示設定（言語）
    this.unsubs.push(
      onSnapshot(
        this.settingsRef(),
        (snap) => {
          this.displaySettings.set(
            snap.exists() ? displaySettingsFromDoc(snap.data()) : { ...DEFAULT_DISPLAY_SETTINGS },
          );
        },
        onErr("settings"),
      ),
    );
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

  // --- 変更（オフラインでもローカルキャッシュに書かれ、再接続で自動送信される） ---
  async upsertRecipe(recipe: Recipe): Promise<void> {
    await setDoc(doc(this.recipesCol(), recipe.id), toPlain(recipe));
  }
  async deleteRecipe(id: string): Promise<void> {
    await deleteDoc(doc(this.recipesCol(), id));
  }
  async upsertShoppingItem(item: ShoppingItem): Promise<void> {
    await setDoc(doc(this.shoppingCol(), item.id), toPlain(item));
  }
  async deleteShoppingItem(id: string): Promise<void> {
    await deleteDoc(doc(this.shoppingCol(), id));
  }
  async clearCheckedShoppingItems(): Promise<void> {
    // キャッシュ済みの現在値から checked を抽出して一括削除
    const snap = await getDocs(query(this.shoppingCol()));
    const batch = writeBatch(this.db);
    snap.forEach((d) => {
      if (d.data().checked) batch.delete(d.ref);
    });
    await batch.commit();
  }
  async savePreferences(prefs: Preferences): Promise<void> {
    await setDoc(this.prefsRef(), toPlain({ ...prefs, updatedAt: Date.now() }));
  }
  async saveDisplaySettings(settings: DisplaySettings): Promise<void> {
    await setDoc(this.settingsRef(), toPlain({ ...settings, updatedAt: Date.now() }));
  }
  async setSpaceName(name: string): Promise<void> {
    await setDoc(this.spaceRef(), { name, updatedAt: Date.now() }, { merge: true });
  }

  dispose(): void {
    for (const u of this.unsubs) {
      try {
        u();
      } catch {
        /* noop */
      }
    }
    this.unsubs = [];
  }
}
