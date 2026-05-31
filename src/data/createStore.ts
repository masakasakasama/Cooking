import { getFirebase, isFirebaseConfigured } from "../firebase/config";
import { ensureAnonymousUser } from "../firebase/auth";
import { LocalStore } from "./localStore";
import { FirestoreStore } from "./firestoreStore";
import type { SpaceStore } from "./store";

export interface CreateStoreOptions {
  /** 新規作成時のスペース名。参加時は undefined。 */
  initialName?: string;
}

/**
 * 環境に応じて適切な SpaceStore を生成する。
 * - Firebase 設定あり: FirestoreStore を即生成（匿名サインインは内部で非同期に待つ）
 * - 設定なし: LocalStore（ローカルモード）
 *
 * 重要: ここで匿名サインインを await しない。await すると認証が詰まったとき
 * createStore 全体がハングし、UI が「接続中…」で固まる。
 * FirestoreStore 側が User の Promise を受け取り、自前のタイムアウト/リトライで処理する。
 */
export async function createStore(
  spaceId: string,
  opts: CreateStoreOptions = {},
): Promise<SpaceStore> {
  if (isFirebaseConfigured()) {
    const fb = getFirebase();
    if (fb) {
      // 毎回 ensureAnonymousUser() を呼ぶファクトリ。失敗時に内部キャッシュが
      // 破棄されるので、リトライ時は新しいサインイン試行になる。
      return new FirestoreStore(fb.db, spaceId, () => ensureAnonymousUser(), opts.initialName);
    }
  }
  return new LocalStore(spaceId, opts.initialName ?? "My Kitchen");
}

export function cloudModeAvailable(): boolean {
  return isFirebaseConfigured();
}
