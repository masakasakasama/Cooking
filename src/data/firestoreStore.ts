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
import { interpretFirebaseError } from "../firebase/errors";
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

  private initialName?: string;
  private unsubs: Array<() => void> = []; // 接続イベント等（恒久）
  private snapshotUnsubs: Array<() => void> = []; // onSnapshot リスナー（張り直し対象）
  private online = typeof navigator === "undefined" ? true : navigator.onLine;
  private fromCache = true;
  private hasPending = false;
  private listenersAttached = false;
  private membershipOk = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelay = 2000; // 自動リトライの初期待機（指数バックオフ）
  private disposed = false;

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
    this.initialName = initialName;

    this.attachConnectivity();
    void this.bootstrap();
  }

  /**
   * 起動シーケンス（自己回復つき）。
   * 1) メンバー登録をサーバー確定まで待つ（待たずにリスナーを張ると permission-denied になる競合バグを回避）
   * 2) 確定後にリスナーを張る
   * 失敗したら指数バックオフで自動リトライ。一時的エラーなら勝手に復旧する。
   */
  private async bootstrap(): Promise<void> {
    if (this.disposed) return;
    this.clearRetry();

    if (this.syncStatus.value.state !== "synced") {
      this.syncStatus.set({ state: "connecting", pendingWrites: 0 });
    }

    try {
      await this.ensureMembership();
      this.membershipOk = true;
      this.retryDelay = 2000; // 成功したらバックオフをリセット
      if (!this.listenersAttached) {
        this.attachListeners();
        this.listenersAttached = true;
      }
    } catch (err) {
      this.reportError(err);
      this.scheduleRetry();
    }
  }

  private scheduleRetry(): void {
    if (this.disposed || this.retryTimer) return;
    const delay = this.retryDelay;
    this.retryDelay = Math.min(this.retryDelay * 2, 30000); // 最大30秒
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.bootstrap();
    }, delay);
  }

  private clearRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /** エラーを解釈して UI に出す。一時的エラーは offline 表示、恒久エラーは error 表示。 */
  private reportError(err: unknown): void {
    const info = interpretFirebaseError(err);
    console.error(`[firestore] ${info.code}:`, err);
    this.syncStatus.set({
      state: info.transient && this.online === false ? "offline" : "error",
      pendingWrites: 0,
      message: info.message,
      errorCode: info.code,
    });
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
   *
   * 重要: ここで例外を握りつぶさず呼び出し元(bootstrap)に投げる。
   * これによりエラーが UI に出て、かつ自動リトライが効く。
   */
  private async ensureMembership(): Promise<void> {
    // 注意: 事前に getDoc で読まないこと。存在しないスペースの read はルール上
    // permission-denied になる（作成前は memberUids が無い）。
    // setDoc(merge) は「無ければ create / あれば update」を 1 回でこなし、
    // どちらのルールも memberUids に自分が居れば通る。
    const base: Record<string, unknown> = {
      memberUids: arrayUnion(this.uid),
      updatedAt: Date.now(),
      // createdAt は未設定時のみ入れたいが、merge なので毎回入れても実害は小さい。
      // ただし name は既存を尊重したいので、作成意図(initialName)がある時だけ送る。
    };
    if (this.initialName !== undefined) {
      base.name = this.initialName;
      base.createdAt = Date.now();
    }
    await setDoc(this.spaceRef(), base, { merge: true });
  }

  private attachConnectivity(): void {
    if (typeof window === "undefined") return;
    const goOnline = () => {
      this.online = true;
      // 再接続したらメンバー登録/リスナーを張り直して回復を試みる
      if (!this.membershipOk || !this.listenersAttached) {
        void this.bootstrap();
      } else {
        this.recomputeStatus();
      }
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

  private detachListeners(): void {
    for (const u of this.snapshotUnsubs) {
      try {
        u();
      } catch {
        /* noop */
      }
    }
    this.snapshotUnsubs = [];
  }

  private recomputeStatus(): void {
    // 恒久エラー表示中は、スナップショットの metadata で上書きしない
    if (this.syncStatus.value.state === "error") return;
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
      const info = interpretFirebaseError(err);
      console.error(`[firestore] ${label} 購読エラー ${info.code}`, err);
      this.reportError(err);
      // 一時的エラー（権限がまだ伝播していない等）はリスナーを張り直して自己回復を試みる
      if (info.transient) {
        this.listenersAttached = false;
        this.detachListeners();
        this.scheduleRetry();
      }
    };

    // スペースのメタ情報
    this.snapshotUnsubs.push(
      onSnapshot(
        this.spaceRef(),
        (snap) => {
          this.meta.set(snap.exists() ? spaceMetaFromDoc(this.spaceId, snap.data()) : null);
        },
        onErr("space"),
      ),
    );

    // レシピ（このリスナーの metadata を主たる同期状態の指標にする）
    this.snapshotUnsubs.push(
      onSnapshot(
        query(this.recipesCol()),
        { includeMetadataChanges: true },
        (snap) => {
          // データが流れてきた = 同期成功。エラー表示中なら解除し、バックオフをリセット。
          if (this.syncStatus.value.state === "error") {
            this.syncStatus.set({ state: "synced", pendingWrites: 0 });
          }
          this.retryDelay = 2000;
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
    this.snapshotUnsubs.push(
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
    this.snapshotUnsubs.push(
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
    this.snapshotUnsubs.push(
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
    this.disposed = true;
    this.clearRetry();
    this.detachListeners();
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
