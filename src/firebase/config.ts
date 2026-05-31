// ----------------------------------------------------------------------------
// Firebase 初期化（遅延・任意）
// ----------------------------------------------------------------------------
// .env に Firebase 設定があれば初期化してクラウド同期モードになる。
// 無ければ初期化せず、アプリはローカルモード (localStorage) で動く。
// ----------------------------------------------------------------------------

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { defaultFirebaseConfig } from "./firebaseConfig";

const env = import.meta.env;

// 環境変数があればそれを優先し、無ければコミット済みの既定値にフォールバックする。
// （CI で Secrets が未設定でも、既定値でクラウド同期が動く。ローカルでは .env で上書き可能。）
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
};

/** 必須項目が揃っているか = クラウド同期モードか */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.appId &&
      firebaseConfig.authDomain,
  );
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

interface FirebaseHandles {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
}

/**
 * Firebase を初期化（idempotent）。未設定なら null を返す。
 * Firestore はオフライン永続キャッシュ + マルチタブ対応で初期化する。
 */
export function getFirebase(): FirebaseHandles | null {
  if (!isFirebaseConfigured()) return null;

  if (app && db && auth) return { app, db, auth };

  try {
    app = initializeApp(firebaseConfig);
    // persistentLocalCache = IndexedDB を使ったオフライン永続化。
    // ネットワークが無くても最後に取得したデータを表示できる。
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
    auth = getAuth(app);
    return { app, db, auth };
  } catch (err) {
    console.error("[firebase] 初期化に失敗しました。ローカルモードにフォールバックします。", err);
    app = null;
    db = null;
    auth = null;
    return null;
  }
}
