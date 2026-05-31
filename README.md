# 🍳 Cooking — 共有レシピ & 買い物リスト

二人（複数デバイス）で**自動同期**する料理アプリ。
保存レシピ・買い物リスト・好み設定・今日のおすすめが、同じ共有リンクを開いた端末すべてで同期されます。

- **Firebase 未設定でもローカルモードで動く**（この端末のみ・`localStorage`）
- **Firebase 設定済みなら複数デバイスで自動同期**（Cloud Firestore リアルタイム）
- 無料運用前提（Firebase **Spark プラン**の無料枠／Cloud Functions・Storage 不使用）
- 日本語 🇯🇵 / ドイツ語 🇩🇪 切替トグル
- **レシピ検索＆取り込み**（TheMealDB / 無料・キー不要）— 「さがす」タブ
- **AI写真解析**（料理写真→材料・手順を自動抽出 / 任意・Cloudflare Worker）

## さがす（レシピ検索・取り込み）

「さがす」タブで [TheMealDB](https://www.themealdb.com/)（無料・APIキー不要の公開レシピDB）を検索し、
気に入ったレシピを「＋追加」で自分たちのスペースに取り込めます。画像は外部URLを使うので
Firestore 容量を圧迫しません。※TheMealDB は英語中心。取り込み後に各 Ja/De を編集できます。

> Instagram からの自動取得は実装していません。Meta は 2025年4月に旧 oEmbed を廃止し、
> 新APIは認証必須かつ「埋め込み表示」以外の用途を規約で禁止しているため
> （レシピデータとしての取り込みは規約違反）。代わりに上記のレシピ検索を使ってください。

## AI写真解析（任意）

料理写真からタイトル・材料・手順を自動抽出します。**AI APIキーをフロントに置かない**ため、
`worker/`（Cloudflare Worker）経由で AI を呼びます。既定モデルは最新の高性能ビジョンモデル
（`gemini-2.5-flash`。旧 `gemini-1.5-flash` は使いません）。`wrangler.toml` の `MODEL` で変更可、
`AI_PROVIDER=openai` で OpenAI 互換にも切替可能。

```bash
cd worker
npm install
npx wrangler secret put GEMINI_API_KEY   # Google AI Studio で無料取得したキー
npx wrangler deploy                       # → https://cooking-ai-worker.<account>.workers.dev
```

デプロイ後、Worker の URL をフロントに教える:
- ローカル: `.env` に `VITE_AI_WORKER_URL=https://cooking-ai-worker.<account>.workers.dev`
- GitHub Pages: リポジトリ Settings → Variables に `VITE_AI_WORKER_URL` を登録 → 再デプロイ

未設定でもアプリは動きます（「さがす」タブの AI ボタンが「未設定」と表示されるだけ）。

---

## クイックスタート

```bash
npm install
npm run dev      # 開発サーバ（http://localhost:5173）
npm run build    # 本番ビルド（dist/）
npm run preview  # ビルド結果をプレビュー
```

この時点で **`.env` なしでもローカルモードで完全に動きます**。
複数デバイス同期を有効にするには下の「Firebase 設定」へ。

---

## モード

| | ローカルモード | クラウド同期モード |
|---|---|---|
| 条件 | `.env` に Firebase 設定なし | `.env` に Firebase 設定あり |
| 保存先 | `localStorage`（同一ブラウザの別タブは同期） | Cloud Firestore（全デバイス同期） |
| オフライン | 常にローカル | IndexedDB 永続キャッシュで最後のデータを表示 |
| 認証 | なし | Firebase Anonymous Auth（端末ごとに匿名 uid） |

ヘッダーの同期バッジで状態が分かります：
`ローカルのみ / 接続中… / 同期中… / 同期済み / オフライン / 同期エラー`

---

## Firebase 設定（無料・Spark プラン）

1. **プロジェクト作成** — [Firebase Console](https://console.firebase.google.com/) で新規プロジェクト。
2. **Anonymous Auth を有効化** — Authentication → Sign-in method → **匿名** を有効に。
3. **Cloud Firestore を作成** — Firestore Database → データベースを作成（本番モード／好きなリージョン）。
4. **Web アプリを登録** — プロジェクト設定 → マイアプリ → Web。表示される設定値を控える。
5. **`.env` を作成**：

   ```bash
   cp .env.example .env
   ```

   ```dotenv
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

6. **セキュリティルールを反映** — `firestore.rules` を Console の Firestore → ルール に貼るか、CLI で：

   ```bash
   npm i -g firebase-tools
   firebase login
   cp .firebaserc.example .firebaserc   # default にプロジェクトIDを設定
   firebase deploy --only firestore:rules
   ```

7. `npm run dev` を再起動。ヘッダーが「☁️ クラウド同期モード」になれば成功。

> `.env` は `.gitignore` 済み。**API キー等はコミットされません。**

### 固定の共有リンクにする（毎回作成しない）

スペースIDは任意の文字列でOKなので、固定リンクは2通りで作れます。

- **そのまま固定IDを使う**：`https://<ドメイン>/space/futari-kitchen` を直接開くだけ。
  Firebase 設定済みなら初回アクセスでそのスペースが自動作成され、以降は同じデータ。これを彼女に送る。
- **ドメイン直打ちで固定スペースへ**：`.env` に `VITE_DEFAULT_SPACE_ID=futari-kitchen` を設定すると、
  `https://<ドメイン>/` を開いただけで `/space/futari-kitchen` に入る。

  ```dotenv
  VITE_DEFAULT_SPACE_ID=futari-kitchen
  ```

---

## 公開（無料）

### A. Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

### A-2. GitHub Pages（いつものGitHubリンクで固定公開）

固定リンク: **`https://masakasakasama.github.io/Cooking/space/<好きなID>`**
（同期は Firebase が担当。Pages はホスティングと固定リンクを提供。）

`.github/workflows/deploy.yml` で main への push 時に自動ビルド・公開します。初回の手順：

1. **Pages を有効化** — リポジトリ Settings → Pages → Build and deployment → Source を
   **「GitHub Actions」** に。
2. **Firebase 設定を Secrets 登録** — Settings → Secrets and variables → Actions → *Secrets* に：
   `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_AUTH_DOMAIN` / `VITE_FIREBASE_PROJECT_ID` /
   `VITE_FIREBASE_STORAGE_BUCKET` / `VITE_FIREBASE_MESSAGING_SENDER_ID` / `VITE_FIREBASE_APP_ID`
3. **（任意）固定スペースID** — 同画面の *Variables* に `VITE_DEFAULT_SPACE_ID`（例 `futari-kitchen`）。
4. **main にマージ** — このブランチを main にマージ（または Actions タブから手動実行）すると公開。
5. **Firebase の承認ドメイン追加** — Firebase Console → Authentication → Settings →
   承認済みドメインに `masakasakasama.github.io` を追加。

> サブパス `/Cooking/` 配下になるため、`vite.config.ts` の `base` と Router の basename を自動連動。
> 直リンクの404は `404.html` リダイレクトでクリーンURLのまま解決します。
>
> ローカル開発時は `http://localhost:5173/Cooking/` を開いてください（base に合わせています）。
> 別ホストで base を変えたい場合は `VITE_BASE_PATH=/ npm run build`。

### B. Cloudflare Pages

- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `dist`
- 環境変数に `VITE_FIREBASE_*` を設定
- SPA なので「すべてのリクエストを `/index.html` に」フォールバック（`firebase.json` の rewrites 相当）を設定

### iPhone Safari で同期確認

1. 公開 URL（または同一 LAN で `npm run dev -- --host`）を PC とスマホで開く
2. PC で「共有スペースを作成」→ 🔗 でリンクを共有（Safari ではネイティブ共有シートが開く）
3. スマホで同じ `/space/{id}` を開く → レシピ追加・買い物チェックが相互に即反映されることを確認

---

## 使い方

1. **共有スペースを作成** — ホームでスペース名を入れて作成。
2. **リンクを共有** — ヘッダーの「🔗 共有リンクをコピー」を相手に送る。
3. 相手が同じリンク（`/space/{sharedSpaceId}`）を開くと、匿名ログインして `memberUids` に参加し、同じデータを見られる。
4. レシピの追加・編集・削除、買い物リストのチェックが全端末で同期。

---

## アーキテクチャ

```
src/
├─ types.ts                  ドメイン型
├─ i18n.ts                   UI ラベル辞書（JA/DE）
├─ firebase/
│  ├─ config.ts              Firebase 遅延初期化（未設定なら null → ローカル）
│  └─ auth.ts                匿名サインイン
├─ data/
│  ├─ store.ts               SpaceStore インターフェース（local/cloud 共通 API）
│  ├─ localStore.ts          localStorage 実装（BroadcastChannel でタブ間同期）
│  ├─ firestoreStore.ts      Firestore 実装（onSnapshot リアルタイム）
│  ├─ firestoreMappers.ts    Firestore ⇄ ドメイン型 変換
│  └─ createStore.ts         環境に応じてストアを選ぶファクトリ
├─ store/SpaceContext.tsx    ストア購読を React state に橋渡し
├─ lib/
│  ├─ image.ts               画像を 200KB 以下に圧縮（サムネイル）
│  └─ recommend.ts           おすすめ算出（MVP スタブ・決定論的）
├─ components/               UI（レシピ/買い物/好み/おすすめ + 同期バッジ等）
└─ pages/                    Home（作成/参加）, Space（アプリ本体）
```

UI 側は `SpaceStore` インターフェースだけに依存し、ローカル/クラウドの違いを意識しません。

### Firestore データ構造

```
/spaces/{spaceId}
  name, createdAt, updatedAt, memberUids: string[]

  /recipes/{recipeId}
    titleJa, titleDe, sourceUrl, imageDataUrl, timeMinutes,
    difficulty, tags[], status, memo, createdAt, updatedAt,
    ingredients[] (埋め込み), steps[] (埋め込み)

  /shoppingItems/{itemId}
    nameJa, nameDe, amount, checked, recipeIds[], createdAt, updatedAt

  /preferences/main
    favoriteIngredients[], dislikedIngredients[], forbiddenIngredients[],
    preferredGenres[], maxCookingTimeMinutes, updatedAt

  /settings/main
    lang, updatedAt
```

> **設計メモ**: 仕様案では `ingredients` / `steps` をサブコレクションにしていましたが、
> **無料枠の read 数最小化**のため recipe ドキュメント内に配列で埋め込んでいます
> （リスナー1本・原子的更新）。将来サブコレクションへ移行可能な構造です。

### 同期・オフライン・コンフリクト

- **リアルタイム**: 各コレクション/ドキュメントを `onSnapshot` で購読。片方の編集が他方へ自動反映。
- **オフライン**: `persistentLocalCache`（IndexedDB）で最後のデータを表示。編集はキャッシュに積まれ、
  再接続時に Firestore へ自動送信される。
- **コンフリクト**: 各ドキュメントに `updatedAt`(epoch ms) を持たせ、Firestore の last-write-wins に委ねる
  簡易方式（MVP）。

### セキュリティ（`firestore.rules`）

- 匿名サインイン必須。
- `spaces/{id}` の `memberUids` に含まれる uid だけが、その配下を read/write 可能。
- 共有リンクを知っている人は「自分を `memberUids` に追加」して参加できる（MVP は個人利用前提）。
- 将来の**共有パスコード**追加ポイントを `update` ルールにコメントで明記。

---

## 無料運用の制約（このリポジトリで守っていること）

- ❌ Cloud Functions 不使用 ❌ Firebase Storage 不使用 ❌ 外部 DB 不使用
- 🖼️ 画像はブラウザ側で **≤200KB に圧縮**したサムネイルのみ Firestore 保存。
  `sourceUrl` があれば画像本体よりリンクを優先。元画像の完全保存は端末ローカル/将来の Storage 対応へ。
- 🤖 AI 解析は MVP ではスタブ（好み設定からの決定論ロジック）。**AI API キーはフロントに置かない**。
  将来 AI を入れる場合のみ Cloudflare Worker / Vercel Function を追加。

---

## 今後の改善案（「他にいい提案あったら教えて」への回答）

優先度つきで提案します。

1. **共有パスコード** — リンク + 4桁コードで参加制御（ルールに拡張ポイントは用意済み）。👫 二人利用なら早めに。
2. **PWA 化** — `manifest.json` + Service Worker でホーム画面追加・完全オフライン起動。iPhone でアプリっぽく。
3. **URL から自動取り込み** — レシピサイトの URL を貼ると OGP 画像/タイトルを取得（CORS 回避に軽量 Worker が必要）。
4. **献立カレンダー / 週次プランナー** — 「今日のおすすめ」を週間プランへ拡張し、買い物リストを自動生成。
5. **材料の自動集約** — 複数レシピを買い物リストへ入れたとき同じ食材をまとめて数量合算。
6. **言語を端末ごとに** — 現在 `lang` は共有同期。二人で別言語なら端末ローカル設定に分離するのも手。
7. **Firebase Storage 対応（任意）** — 無料枠 5GB の範囲で原画像も保存可能に（MVP の方針は維持）。
8. **AI レシピ提案** — Worker 経由で Claude API を呼び、好み/在庫からメニュー生成（キーはサーバ側）。

---

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバ |
| `npm run build` | 型チェック + 本番ビルド |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run lint` | 型チェックのみ |
