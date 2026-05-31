/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** 設定するとルート "/" を /space/{この値} へ転送する固定スペース */
  readonly VITE_DEFAULT_SPACE_ID?: string;
  /** AI画像解析 Worker の URL。未設定なら AI 機能は無効。 */
  readonly VITE_AI_WORKER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
