// ----------------------------------------------------------------------------
// Firebase エラーの解釈（同期エラーの原因を日本語で UI に出す）
// ----------------------------------------------------------------------------

export interface FirebaseErrorInfo {
  code: string;
  /** ユーザー向けの短い説明 */
  message: string;
  /** リトライで回復しうる一時的エラーか */
  transient: boolean;
}

function codeOf(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: unknown }).code);
  }
  return "unknown";
}

export function interpretFirebaseError(err: unknown): FirebaseErrorInfo {
  const code = codeOf(err);
  switch (code) {
    case "permission-denied":
    case "firestore/permission-denied":
      return {
        code,
        message: "権限エラー: Firestoreのセキュリティルールを確認してください",
        transient: false,
      };
    case "unavailable":
    case "firestore/unavailable":
      return {
        code,
        message: "ネットワーク不通: オフラインの可能性。再接続を待っています",
        transient: true,
      };
    case "failed-precondition":
    case "firestore/failed-precondition":
      return {
        code,
        message:
          "Firestore未作成の可能性: Firebaseコンソールで Cloud Firestore を作成してください",
        transient: false,
      };
    case "unauthenticated":
    case "firestore/unauthenticated":
    case "auth/network-request-failed":
      return {
        code,
        message: "認証エラー: 匿名ログインに失敗。承認済みドメインを確認してください",
        transient: true,
      };
    case "resource-exhausted":
      return {
        code,
        message: "無料枠の上限に達した可能性があります",
        transient: false,
      };
    case "not-found":
    case "firestore/not-found":
      return {
        code,
        message: "データベースが見つかりません: Cloud Firestore を作成してください",
        transient: false,
      };
    default:
      return {
        code,
        message: `同期エラー (${code})`,
        transient: true,
      };
  }
}
