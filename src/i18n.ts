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

  // 献立・カテゴリ・人数・調理モード・食材検索
  category: { ja: "カテゴリ", de: "Kategorie" },
  catAll: { ja: "すべて", de: "Alle" },
  cat_main: { ja: "主菜", de: "Hauptgericht" },
  cat_side: { ja: "副菜", de: "Beilage" },
  cat_soup: { ja: "汁物", de: "Suppe" },
  cat_rice: { ja: "ご飯もの", de: "Reisgericht" },
  cat_noodle: { ja: "麺", de: "Nudeln" },
  cat_dessert: { ja: "デザート", de: "Dessert" },

  role_main: { ja: "主菜", de: "Hauptgericht" },
  role_side: { ja: "副菜", de: "Beilage" },
  role_soup: { ja: "汁物", de: "Suppe" },

  servings: { ja: "人数", de: "Portionen" },
  servingsUnit: { ja: "人前", de: "P." },

  todaysMenu: { ja: "今日の献立", de: "Heutiges Menü" },
  anotherMenu: { ja: "別の献立", de: "Anderes Menü" },
  menuToShopping: { ja: "献立の材料を買い物リストへ", de: "Zutaten zur Einkaufsliste" },
  inSeason: { ja: "旬", de: "Saison" },

  sortBy: { ja: "並び替え", de: "Sortieren" },
  sort_recent: { ja: "新しい順", de: "Neueste" },
  sort_cooked: { ja: "よく作る順", de: "Oft gekocht" },
  sort_time: { ja: "時短順", de: "Schnellste" },

  // さがす（食材から / 世界）
  fridgeMode: { ja: "食材から", de: "Aus Zutaten" },
  worldMode: { ja: "世界のレシピ", de: "Weltrezepte" },
  fridgeHint: {
    ja: "家にある食材を入れると、日本で作れる料理を「作れる順」に出します（調味料は持っている前提）。",
    de: "Gib vorhandene Zutaten ein – passende Gerichte erscheinen nach Machbarkeit (Würzmittel vorausgesetzt).",
  },
  fridgePlaceholder: { ja: "例: 豚肉 玉ねぎ じゃがいも", de: "z.B. Schwein Zwiebel Kartoffel" },
  fridgeEmpty: { ja: "食材を入力してください（スペース区切り）。", de: "Zutaten eingeben (durch Leerzeichen getrennt)." },
  fridgeNoMatch: { ja: "その食材で作れる料理が見つかりません。", de: "Keine passenden Gerichte gefunden." },
  canMake: { ja: "作れる", de: "machbar" },
  missingN: { ja: "あと{n}つ", de: "fehlt {n}" },

  // 調理モード
  startCooking: { ja: "作る", de: "Kochen" },
  startTimer: { ja: "計る", de: "Start" },
  stepLabel: { ja: "手順", de: "Schritt" },
  prevStep: { ja: "前へ", de: "Zurück" },
  nextStep: { ja: "次へ", de: "Weiter" },
  finishCooking: { ja: "完成！", de: "Fertig!" },
  markCooked: { ja: "作った", de: "Gekocht" },
  markedCooked: { ja: "「作った」に記録しました", de: "Als gekocht gespeichert" },

  // おすすめ
  todaysRecommend: { ja: "今日のおすすめ", de: "Heutige Vorschläge" },
  regenerate: { ja: "再計算", de: "Neu berechnen" },
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
