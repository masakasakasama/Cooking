# Cooking アプリ — 仕様まとめ (SPEC)

> 別チャット (Codex 等) にそのまま貼って使うための、プロジェクト要件＋現状の単一ソース。
> 「このリポジトリの続きをやって」と頼むとき、これを1枚貼れば文脈が伝わる。

---

## 0. 一行サマリ

**夫婦（日本在住・日本語/ドイツ語）で複数デバイス自動同期する、料理レシピ＋買い物リストアプリ。**
React + TypeScript + Vite の SPA、Firebase Firestore でリアルタイム同期、GitHub Pages にデプロイ。スマホ（iPhone）での利用が主。

- 本番URL: `https://masakasakasama.github.io/Cooking/`
- リポジトリ: `masakasakasama/Cooking`
- 開発ブランチ: `claude/cooking-app-firebase-sync-kbJ3w`（→ main にマージで自動デプロイ）

---

## 1. プロダクト要件（これまで出した要件・制約）

### 必須要件
- **複数デバイス自動同期**：同じURLを開いた端末すべてで、レシピ・買い物リスト・好み設定が同期される。アカウント登録・ログイン不要（匿名認証）。常に1つの固定スペース (`futari-kitchen`) を共有。
- **二言語対応**：日本語 🇯🇵 / ドイツ語 🇩🇪 をヘッダーのトグルで切替。レシピ内容（タイトル・材料・手順）も Ja/De 両方を持つ。
- **買い物リスト**：チェックを入れたら「買った」として**消える**（タスク完了の挙動）。同期される。
- **日本で作りやすいこと**：おすすめ・献立・検索で出る料理は、**日本のスーパーで材料が揃うもの**だけ。海外の珍しい食材（ラム肉のすね等）を出さない。← 重要。過去に海外APIのランダム出力で失敗した。
- **AI写真解析**：料理写真を撮る/選ぶ → 材料・手順を自動抽出してレシピ化。
- **無料運用**：Firebase Spark プラン無料枠のみ。Cloud Functions・Storage は使わない。サーバーを立てない方向。

### 運用・コスト制約
- Firestore 無料枠を守る：レシピの材料・手順は別ドキュメントにせず recipe ドキュメントに**埋め込む**（read 数削減）。画像は ≤200KB に圧縮、または外部URL。
- 秘密情報をコミットしない。Firebase Web 設定は公開前提なのでコミット可（アクセス制御は Firestore ルール＋匿名認証）。

---

## 2. 技術スタック

| 項目 | 採用 |
|---|---|
| フレームワーク | React 18 + TypeScript 5 |
| ビルド | Vite 5 |
| 同期/DB | Firebase 10（Cloud Firestore, Anonymous Auth, IndexedDB 永続キャッシュ） |
| ルーティング | react-router-dom 6（実質固定スペース運用） |
| スタイル | プレーン CSS（`src/index.css`、CSS変数でテーマ）。UIライブラリ不使用 |
| AI | Google Gemini（既定 `gemini-2.5-flash`）。2方式（下記） |
| デプロイ | GitHub Actions → GitHub Pages（`.github/workflows/deploy.yml`、main push で起動） |
| 外部レシピ検索 | TheMealDB（無料・キー不要、英語）— 「世界のレシピ」検索用 |

スクリプト：`npm run dev` / `npm run build`（`tsc -b && vite build`）/ `npm run lint`（`tsc -b --noEmit`）。
ビルド時 `VITE_BASE_PATH=/Cooking/` を使う（Pages のサブパス）。

---

## 3. データモデル（`src/types.ts`）

```ts
type Lang = "ja" | "de";
type RecipeStatus = "want" | "cooking" | "cooked" | "favorite";
type Difficulty = "easy" | "medium" | "hard";
type DishCategory = "main" | "side" | "soup" | "rice" | "noodle" | "dessert"; // 主菜/副菜/汁物/ご飯/麺/デザート

interface Ingredient { id; nameJa; nameDe; amount; order; }
interface CookingStep { id; textJa; textDe; order; }

interface Recipe {
  id; titleJa; titleDe; sourceUrl;
  imageDataUrl;            // ≤200KB圧縮 or 外部URL（空可）
  timeMinutes; difficulty; tags[]; status; memo;
  ingredients[]; steps[];  // 埋め込み
  createdAt; updatedAt;
  // 追加メタ（任意・後方互換のため optional）
  category?; seasonMonths?[]; servings?; emoji?; cookedCount?; lastCookedAt?;
}

interface ShoppingItem { id; nameJa; nameDe; amount; checked; recipeIds[]; createdAt; updatedAt; }
interface Preferences {
  favoriteIngredients[]; dislikedIngredients[]; forbiddenIngredients[]; // NG=完全除外
  preferredGenres[]; maxCookingTimeMinutes; updatedAt;
}
interface DisplaySettings { lang; updatedAt; }
```

Firestore 構成：`/spaces/{spaceId}` 配下に recipes / shoppingItems / preferences / displaySettings / meta。
（※ `warikan-app-120fd` プロジェクトに相乗り。料理データは `/spaces/` 配下のみ）

---

## 4. アーキテクチャ

- **Store 抽象**（`src/data/store.ts`）：`SpaceStore` インターフェイスを
  - `localStore.ts`（localStorage + BroadcastChannel、同一ブラウザ同期）
  - `firestoreStore.ts`（クラウド・リアルタイム・オフラインキャッシュ）
  が実装。`createStore.ts` が Firebase 設定の有無で自動選択。UI は違いを意識しない。
- **状態**：`store/SpaceContext.tsx` の `SpaceProvider` が購読し、`useSpace()` で `{ lang, recipes, shoppingItems, preferences, store, ... }` を配る。
- **画面**：`pages/SpacePage.tsx` が下タブで5画面を出し分け（レシピ / さがす / 買い物 / おすすめ / 好み）。
- **i18n**：`src/i18n.ts` の辞書 `t(key, lang)`。UIラベルのみ（レシピ内容は Ja/De フィールド）。

---

## 5. 実装済み機能

### 5.1 厳選レシピDB（`src/data/curatedRecipes.ts`）★おすすめ品質の土台
日本で作りやすい定番 約30品（生姜焼き・肉じゃが・親子丼・唐揚げ・麻婆豆腐・豚汁 など）を手書きで保持。
全品が JA/DE 二言語、`category`（主菜/副菜/汁物/ご飯/麺/デザート）、`seasonMonths`（旬）、`servings`、`emoji` 付き。
id は `curated:*` で安定。表示はそのまま、「追加」で新IDを振って自分のレシピへ複製。

### 5.2 おすすめ / 献立（`src/lib/recommendCurated.ts`, `components/RecommendView.tsx`）
- **おすすめ**：厳選DBを 好み + 旬(今月) + 日替わりハッシュ で決定論的にスコアリング。NG食材は除外。同日・同スペースなら全端末で同じ並び。
- **献立ビルダー**：主菜+副菜+汁物を各1品自動選定。「別の献立」で組み替え、「材料を買い物リストへ」で全材料を集約して追加。

### 5.3 さがす（`components/DiscoverView.tsx`）
- **AI写真解析**（最上部ボタン）
- **食材から検索**「冷蔵庫にあるもので」：手持ち食材を入れると、厳選DBから**作れる順**（不足が少ない順）に表示。「あと2つ」表示。調味料（塩・醤油等）は持っている前提で不足から除外。日本語の部分一致対応（例 `豚肉`→`豚ロース薄切り`、主要食材頭文字 `豚牛鶏鮭鯖…`）。
- **世界のレシピ**：TheMealDB をキーワード検索して取り込み（任意）。

### 5.4 調理モード（`components/CookMode.tsx`）
全画面で手順を1ステップずつ大表示。**Wake Lock で画面が消えない**。手順テキスト内の「10分」「5秒」「1時間」「10 Min.」等を抽出し、**タップでカウントダウンタイマー起動**（複数同時可、完了でバイブ）。人数スケーリング後の材料も確認可。

### 5.5 レシピ詳細（`components/RecipeDetail.tsx`）
材料・手順表示、**人数スケーリング**（ステッパーで 250g→375g、大さじ2→大さじ4 を自動換算）、調理モード開始、買い物リストへ追加、「作った」記録（`cookedCount` 加算）。curated は「追加」で保存。

### 5.6 買い物リスト（`components/ShoppingView.tsx`）
チェックで「買った」=消える（同期）。**売り場ごとにグループ表示**（野菜/肉/魚/卵乳/調味料/乾物/その他）。レシピや献立から追加するとき**同じ食材を合算・重複排除**（`src/lib/ingredients.ts` の `aggregateIngredients`）。

### 5.7 レシピ一覧（`components/RecipesView.tsx`）
検索、**カテゴリ絞り込み**、**並び替え**（新しい順/よく作る順/時短順）、作った回数表示、詳細/調理モード起動、編集、削除。

### 5.8 好み設定（`components/PreferencesView.tsx`）
好きな/苦手な/NG食材、好きなジャンル、最大調理時間。＋ **AI設定**（自分の Gemini キーを端末ローカルに保存）。

---

## 6. AI写真解析（2方式・`src/lib/aiAnalyze.ts`）
1. **ユーザー自身の Gemini キー方式（推奨・サーバー不要）**：「好み」タブでキー入力 → `localStorage` に保存（同期もサーバー送信もしない）→ ブラウザから直接 Gemini を呼ぶ。
2. **Worker 方式（任意）**：`VITE_AI_WORKER_URL` を設定すると Cloudflare Worker 経由（キーをフロントに置かない）。

既定モデル `gemini-2.5-flash`。料理写真 → タイトル/材料(5–12)/手順(3–8)/時間/タグ を JA/DE で JSON 抽出。

---

## 7. ディレクトリ構成（主要）

```
src/
  types.ts                  ドメイン型 + 定数
  i18n.ts                   JA/DE 辞書 t()
  pages/SpacePage.tsx       タブ＆シェル
  store/SpaceContext.tsx    状態配布
  data/
    store.ts createStore.ts localStore.ts firestoreStore.ts firestoreMappers.ts
    curatedRecipes.ts       ★厳選レシピDB
  lib/
    recommendCurated.ts     ★おすすめ/献立/食材検索エンジン
    ingredients.ts          ★売り場分類・分量スケール・買い物集約
    timers.ts               手順→タイマー抽出
    recipeSearch.ts         TheMealDB（searchRecipes/lookupMeal/mealToRecipe）
    aiAnalyze.ts            Gemini 写真解析（2方式）
    image.ts display.ts id.ts appConfig.ts
  components/
    RecipesView RecipeDetail RecipeEditor CookMode
    DiscoverView RecommendView ShoppingView PreferencesView
    SyncBadge ShareBar LangToggle
  firebase/ config.ts auth.ts firebaseConfig.ts errors.ts
  index.css                 全スタイル（CSS変数テーマ）
```

---

## 8. コーディング規約・方針
- コメント・UI文言は日本語中心、レシピ内容は Ja/De 併記。
- 既存の命名・CSSクラス・コメント密度に合わせる。UIライブラリを足さない。
- Firestore read を増やさない（埋め込み維持）。画像は圧縮。
- 後方互換：`Recipe` への新フィールドは optional で足す。
- 失敗してもアプリは動く（AI未設定・ネット断はフォールバック/握りつぶし）。
- デプロイは main へマージ → Actions が Pages へ。直接 main に push しない（ブランチ作業）。

---

## 9. 既知の制約・非対応
- Instagram 等からの自動取得はしない（Meta 規約により不可）。
- 栄養計算・献立カレンダー（週次）・パントリー在庫管理は未実装（候補）。
- 厳選DBは約30品（手書き）。増やすのは `curatedRecipes.ts` に追記。
- ドイツ語訳は機械的な部分あり（要ネイティブ確認）。

## 10. 今後のTODO候補
- 厳選レシピを増やす / 旬データの精緻化
- 週次献立カレンダー、栄養目安、パントリー（在庫から自動で買い物リスト差し引き）
- レシピのお気に入り並べ替え、作った履歴（写真ログ）
- URL からのレシピ取り込み（schema.org/Recipe JSON-LD パース）
