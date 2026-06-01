import type { Lang } from "./types";

// ----------------------------------------------------------------------------
// 画面ラベルの多言語辞書（UI チラ見え部分。レシピ内容は Ja/De フィールドで保持）
// ----------------------------------------------------------------------------

type Dict = Record<string, { ja: string; de: string }>;

const dict: Dict = {
  appName: { ja: "Cooking", de: "Cooking" },
  tagline: { ja: "二人の共有レシピ & 買い物リスト", de: "Gemeinsame Rezepte & Einkaufsliste" },

  // ナビ
  navRecipes: { ja: "レシピ", de: "Rezepte" },
  navShopping: { ja: "買い物", de: "Einkauf" },
  navDiscover: { ja: "さがす", de: "Entdecken" },
  navRecommend: { ja: "おすすめ", de: "Vorschläge" },
  navPreferences: { ja: "好み", de: "Vorlieben" },

  // レシピ検索・取り込み
  discoverTitle: { ja: "レシピをさがす", de: "Rezepte entdecken" },
  discoverHint: {
    ja: "世界のレシピから検索して、気に入ったものを追加できます（TheMealDB / 英語）。",
    de: "Suche in Weltrezepten und füge Favoriten hinzu (TheMealDB / Englisch).",
  },
  discoverSearchPlaceholder: { ja: "料理名で検索（例: chicken, curry）", de: "Nach Gericht suchen (z.B. chicken)" },
  discoverEmpty: { ja: "検索結果がありません。別の語で試してください。", de: "Keine Treffer. Anderes Stichwort versuchen." },
  discoverRandom: { ja: "あなたへのおすすめ", de: "Für euch empfohlen" },
  discoverRefresh: { ja: "他のおすすめ", de: "Andere Vorschläge" },
  importRecipe: { ja: "追加", de: "Hinzufügen" },
  imported: { ja: "レシピを追加しました", de: "Rezept hinzugefügt" },
  importing: { ja: "追加中…", de: "Füge hinzu…" },
  aiAnalyze: { ja: "AIで写真から解析", de: "Per Foto-KI analysieren" },
  aiAnalyzing: { ja: "AI解析中…", de: "KI analysiert…" },
  aiNotConfigured: {
    ja: "AI解析は未設定です（Worker URLが必要）。設定方法はREADME参照。",
    de: "KI-Analyse nicht konfiguriert (Worker-URL nötig). Siehe README.",
  },
  aiFailed: { ja: "AI解析に失敗しました", de: "KI-Analyse fehlgeschlagen" },

  // AI 設定（端末ローカル）
  aiSettings: { ja: "AI設定（写真解析）", de: "KI-Einstellungen (Foto)" },
  aiSettingsHint: {
    ja: "あなたのGemini APIキーを使って料理写真を解析します。キーはこの端末内にのみ保存され、同期もサーバー送信もされません。無料枠で使えます。",
    de: "Nutzt deinen Gemini-API-Key zur Fotoanalyse. Der Key wird nur auf diesem Gerät gespeichert, nicht synchronisiert. Im Gratis-Kontingent nutzbar.",
  },
  aiApiKey: { ja: "Gemini APIキー", de: "Gemini API-Key" },
  aiModel: { ja: "モデル（通常はそのままでOK）", de: "Modell (Standard ok)" },
  aiGetKey: { ja: "→ Google AI Studio で無料キーを取得", de: "→ Gratis-Key bei Google AI Studio holen" },

  // 共有スペース
  createSpace: { ja: "共有スペースを作成", de: "Gemeinsamen Bereich erstellen" },
  createSpaceDesc: {
    ja: "新しい共有スペースを作って、リンクを相手に送ろう。",
    de: "Erstelle einen Bereich und teile den Link.",
  },
  spaceName: { ja: "スペース名", de: "Name des Bereichs" },
  create: { ja: "作成", de: "Erstellen" },
  copyLink: { ja: "共有リンクをコピー", de: "Link kopieren" },
  linkCopied: { ja: "リンクをコピーしました", de: "Link kopiert" },
  joinHint: {
    ja: "このリンクを開いた端末は同じデータを見られます。",
    de: "Geräte mit diesem Link sehen dieselben Daten.",
  },
  leaveSpace: { ja: "別のスペースへ", de: "Bereich wechseln" },

  // レシピ
  addRecipe: { ja: "レシピを追加", de: "Rezept hinzufügen" },
  editRecipe: { ja: "レシピを編集", de: "Rezept bearbeiten" },
  title: { ja: "タイトル", de: "Titel" },
  titleJa: { ja: "タイトル（日本語）", de: "Titel (Japanisch)" },
  titleDe: { ja: "タイトル（ドイツ語）", de: "Titel (Deutsch)" },
  sourceUrl: { ja: "参照URL", de: "Quell-URL" },
  image: { ja: "画像", de: "Bild" },
  timeMinutes: { ja: "調理時間（分）", de: "Zeit (Min.)" },
  difficulty: { ja: "難易度", de: "Schwierigkeit" },
  easy: { ja: "かんたん", de: "Einfach" },
  medium: { ja: "ふつう", de: "Mittel" },
  hard: { ja: "むずかしい", de: "Schwer" },
  tags: { ja: "タグ", de: "Tags" },
  tagsHint: { ja: "カンマ区切り", de: "Mit Komma trennen" },
  memo: { ja: "メモ", de: "Notiz" },
  ingredients: { ja: "材料", de: "Zutaten" },
  steps: { ja: "作り方", de: "Zubereitung" },
  addIngredient: { ja: "材料を追加", de: "Zutat hinzufügen" },
  addStep: { ja: "手順を追加", de: "Schritt hinzufügen" },
  name: { ja: "名前", de: "Name" },
  amount: { ja: "分量", de: "Menge" },
  addToShopping: { ja: "買い物リストへ", de: "Zur Einkaufsliste" },
  addedToShopping: { ja: "買い物リストに追加しました", de: "Zur Einkaufsliste hinzugefügt" },

  // ステータス
  statusWant: { ja: "作りたい", de: "Möchte kochen" },
  statusCooking: { ja: "調理中", de: "Koche gerade" },
  statusCooked: { ja: "作った", de: "Gekocht" },
  statusFavorite: { ja: "お気に入り", de: "Favorit" },

  // 買い物
  shoppingList: { ja: "買い物リスト", de: "Einkaufsliste" },
  addItem: { ja: "品目を追加", de: "Artikel hinzufügen" },
  clearChecked: { ja: "チェック済みを削除", de: "Erledigte löschen" },
  emptyShopping: { ja: "買い物リストは空です", de: "Einkaufsliste ist leer" },

  // 好み
  preferences: { ja: "好み設定", de: "Vorlieben" },
  favoriteIngredients: { ja: "好きな食材", de: "Lieblingszutaten" },
  dislikedIngredients: { ja: "苦手な食材", de: "Ungeliebte Zutaten" },
  forbiddenIngredients: { ja: "NG食材（アレルギー等）", de: "Verbotene Zutaten" },
  preferredGenres: { ja: "好きなジャンル", de: "Lieblingsküche" },
  maxCookingTime: { ja: "最大調理時間（分）", de: "Max. Kochzeit (Min.)" },
  save: { ja: "保存", de: "Speichern" },
  saved: { ja: "保存しました", de: "Gespeichert" },

  // おすすめ
  todaysRecommend: { ja: "今日のおすすめ", de: "Heutige Vorschläge" },
  regenerate: { ja: "再計算", de: "Neu berechnen" },
  recommendStubNote: {
    ja: "※ MVP では好み設定に基づく簡易ロジックで提案しています（AI解析は将来対応）。",
    de: "※ MVP: einfache Logik aus den Vorlieben (KI-Analyse folgt später).",
  },
  noRecommend: { ja: "おすすめがありません。レシピを追加してください。", de: "Keine Vorschläge. Bitte Rezepte hinzufügen." },

  // 共通
  cancel: { ja: "キャンセル", de: "Abbrechen" },
  delete: { ja: "削除", de: "Löschen" },
  edit: { ja: "編集", de: "Bearbeiten" },
  confirmDelete: { ja: "削除しますか？", de: "Wirklich löschen?" },
  emptyRecipes: { ja: "まだレシピがありません。", de: "Noch keine Rezepte." },
  search: { ja: "検索", de: "Suche" },
  minutesShort: { ja: "分", de: "Min." },

  // 同期ステータス
  syncLocal: { ja: "ローカルのみ", de: "Nur lokal" },
  syncConnecting: { ja: "接続中…", de: "Verbinde…" },
  syncSyncing: { ja: "同期中…", de: "Synchronisiere…" },
  syncSynced: { ja: "同期済み", de: "Synchronisiert" },
  syncOffline: { ja: "オフライン", de: "Offline" },
  syncError: { ja: "同期エラー", de: "Sync-Fehler" },
};

export function t(key: keyof typeof dict, lang: Lang): string {
  const entry = dict[key];
  if (!entry) return String(key);
  return entry[lang];
}

export type TranslateKey = keyof typeof dict;
