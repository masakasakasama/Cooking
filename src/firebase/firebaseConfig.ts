// ----------------------------------------------------------------------------
// Firebase クライアント設定（公開可能・コミット済み）
// ----------------------------------------------------------------------------
// これは秘密情報ではありません。Firebase の Web 設定はブラウザに配信される前提の値で、
// 実際のアクセス制御は Firestore セキュリティルール + Authentication が担います。
// （Google 公式も Web 設定をクライアントに含めてよいとしています。）
//
// 環境変数 VITE_FIREBASE_* が設定されていればそちらが優先されます（config.ts 参照）。
// これにより GitHub Actions の Secrets 無しでも、この既定値でクラウド同期が動きます。
//
// ※ プロジェクト warikan-app に相乗り。料理データは Firestore の /spaces/ 配下にのみ保存。
// ----------------------------------------------------------------------------
export const defaultFirebaseConfig = {
  apiKey: "AIzaSyDBBD1W-zneFDNi1eZCtYqvyoXyJcmdk0k",
  authDomain: "warikan-app-120fd.firebaseapp.com",
  projectId: "warikan-app-120fd",
  storageBucket: "warikan-app-120fd.firebasestorage.app",
  messagingSenderId: "43289931875",
  appId: "1:43289931875:web:ca26551e40da813b9e4856",
};
