import { getFirebase } from "./config";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";

// ----------------------------------------------------------------------------
// Firebase Anonymous Auth
// ----------------------------------------------------------------------------
// 端末ごとに匿名 uid を1つ持つ。完全なログイン機能は持たない（MVP）。
// 同じ端末では uid が永続化される（Firebase Auth が localStorage に保持）。
// ----------------------------------------------------------------------------

let cached: Promise<User> | null = null;

/** Promise にタイムアウトを付ける（ハング防止） */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * 匿名サインインして User を返す（idempotent）。Firebase 未設定なら null。
 * 一定時間で応答が無ければ reject する（永久ハング防止）。
 */
export function ensureAnonymousUser(timeoutMs = 8000): Promise<User> | null {
  const fb = getFirebase();
  if (!fb) return null;

  if (cached) return cached;

  const core = new Promise<User>((resolve, reject) => {
    // 既にサインイン済みなら即返す
    if (fb.auth.currentUser) {
      resolve(fb.auth.currentUser);
      return;
    }

    const unsub = onAuthStateChanged(
      fb.auth,
      (user) => {
        if (user) {
          unsub();
          resolve(user);
        }
      },
      (err) => {
        unsub();
        reject(err);
      },
    );

    signInAnonymously(fb.auth).catch((err) => {
      unsub();
      reject(err);
    });
  });

  cached = withTimeout(core, timeoutMs, "anonymous sign-in").catch((err) => {
    cached = null; // 失敗は次回リトライできるようにキャッシュを捨てる
    throw err;
  });

  return cached;
}
