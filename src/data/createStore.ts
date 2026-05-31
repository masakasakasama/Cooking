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
 * - Firebase 設定あり: 匿名サインイン → FirestoreStore（クラウド同期）
 * - 設定なし or 失敗: LocalStore（ローカルモード）
 */
export async function createStore(
  spaceId: string,
  opts: CreateStoreOptions = {},
): Promise<SpaceStore> {
  if (isFirebaseConfigured()) {
    try {
      const userPromise = ensureAnonymousUser();
      const fb = getFirebase();
      if (userPromise && fb) {
        const user = await userPromise;
        return new FirestoreStore(fb.db, spaceId, user.uid, opts.initialName);
      }
    } catch (err) {
      console.error("[store] クラウド初期化に失敗、ローカルモードにフォールバック", err);
    }
  }
  return new LocalStore(spaceId, opts.initialName ?? "My Kitchen");
}

export function cloudModeAvailable(): boolean {
  return isFirebaseConfigured();
}
