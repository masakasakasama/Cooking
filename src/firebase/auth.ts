import { getFirebase } from "./config";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";

// ----------------------------------------------------------------------------
// Firebase Anonymous Auth
// ----------------------------------------------------------------------------
// 端末ごとに匿名 uid を1つ持つ。完全なログイン機能は持たない（MVP）。
// 同じ端末では uid が永続化される（Firebase Auth が localStorage に保持）。
// ----------------------------------------------------------------------------

let cached: Promise<User> | null = null;

/** 匿名サインインして User を返す（idempotent）。Firebase 未設定なら null。 */
export function ensureAnonymousUser(): Promise<User> | null {
  const fb = getFirebase();
  if (!fb) return null;

  if (cached) return cached;

  cached = new Promise<User>((resolve, reject) => {
    const unsub = onAuthStateChanged(
      fb.auth,
      (user) => {
        if (user) {
          unsub();
          resolve(user);
        }
      },
      reject,
    );

    // 既存セッションが無ければ匿名サインインを開始
    if (!fb.auth.currentUser) {
      signInAnonymously(fb.auth).catch((err) => {
        unsub();
        cached = null;
        reject(err);
      });
    }
  });

  return cached;
}
