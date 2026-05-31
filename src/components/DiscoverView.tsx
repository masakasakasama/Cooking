import { useEffect, useRef, useState } from "react";
import { useSpace } from "../store/SpaceContext";
import { t } from "../i18n";
import {
  lookupMeal,
  mealToRecipe,
  recommendRecipes,
  searchRecipes,
  type SearchResult,
} from "../lib/recipeSearch";
import { analyzeImageToRecipe, isAiConfigured } from "../lib/aiAnalyze";
import { compressImageToDataUrl } from "../lib/image";

// ----------------------------------------------------------------------------
// レシピをさがす: 外部の公開レシピDB(TheMealDB)を検索し、自分たちのスペースへ取り込む。
// ----------------------------------------------------------------------------
export function DiscoverView() {
  const { lang, store, recipes, preferences } = useSpace();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRandom, setIsRandom] = useState(true);
  const [error, setError] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiFileRef = useRef<HTMLInputElement>(null);

  // 既に取り込み済みか（タイトル一致で簡易判定）
  const importedTitles = new Set(recipes.map((r) => r.titleJa.toLowerCase()));

  const run = async (q: string) => {
    setLoading(true);
    setError("");
    try {
      if (q.trim() === "") {
        // 検索語が無いときは、好み設定に基づくおすすめを表示（学習・検索の前のデフォルト）
        const res = await recommendRecipes({
          favorite: preferences.favoriteIngredients,
          disliked: preferences.dislikedIngredients,
          forbidden: preferences.forbiddenIngredients,
          count: 6,
        });
        setResults(res);
        setIsRandom(true);
      } else {
        const res = await searchRecipes(q);
        setResults(res);
        setIsRandom(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // 初回は（検索する前に）おすすめを表示する
  useEffect(() => {
    void run("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 入力をデバウンスして検索
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void run(query), 450);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  const importRecipe = async (r: SearchResult) => {
    if (!store) return;
    setImportingId(r.externalId);
    try {
      // filter 経由のカードは詳細が無いので lookup で補完
      const full = r.raw.strInstructions ? r.raw : await lookupMeal(r.externalId);
      if (!full) throw new Error("詳細の取得に失敗");
      await store.upsertRecipe(mealToRecipe(full));
      flash(t("imported", lang));
    } catch (e) {
      flash(e instanceof Error ? e.message : String(e));
    } finally {
      setImportingId(null);
    }
  };

  const onAiPhoto = async (file: File | undefined) => {
    if (!file || !store) return;
    setAiBusy(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      const recipe = await analyzeImageToRecipe(dataUrl, lang);
      await store.upsertRecipe(recipe);
      flash(t("imported", lang));
    } catch (e) {
      flash(e instanceof Error ? e.message : t("aiFailed", lang));
    } finally {
      setAiBusy(false);
      if (aiFileRef.current) aiFileRef.current.value = "";
    }
  };

  return (
    <div className="view">
      <h2 className="view-title">{t("discoverTitle", lang)}</h2>
      <p className="hint">{t("discoverHint", lang)}</p>

      {/* AI: 料理写真からレシピを自動生成 */}
      <div className="ai-photo-box">
        <input
          ref={aiFileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onAiPhoto(e.target.files?.[0])}
        />
        <button
          className="btn primary block"
          disabled={aiBusy || !isAiConfigured()}
          onClick={() => aiFileRef.current?.click()}
        >
          {aiBusy ? `✨ ${t("aiAnalyzing", lang)}` : `📷 ${t("aiAnalyze", lang)}`}
        </button>
        {!isAiConfigured() && <p className="hint small">{t("aiNotConfigured", lang)}</p>}
      </div>

      {/* おすすめ見出し（検索前のデフォルト表示）。検索中は検索結果になる。 */}
      {isRandom ? (
        <div className="discover-head">
          <h3 className="discover-section">✨ {t("discoverRandom", lang)}</h3>
          <button className="btn small ghost" onClick={() => run("")} disabled={loading}>
            🔄 {t("discoverRefresh", lang)}
          </button>
        </div>
      ) : null}

      <input
        className="search block-search"
        placeholder={t("discoverSearchPlaceholder", lang)}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p className="hint center">…</p>}
      {error && <p className="empty">{error}</p>}
      {!loading && !error && results.length === 0 && (
        <p className="empty">{t("discoverEmpty", lang)}</p>
      )}

      <ul className="recipe-grid">
        {results.map((r) => {
          const already = importedTitles.has(r.title.toLowerCase());
          return (
            <li key={r.externalId} className="recipe-card">
              <div className="recipe-thumb">
                {r.thumb ? <img src={r.thumb} alt="" loading="lazy" /> : <span className="thumb-placeholder">🍽️</span>}
              </div>
              <div className="recipe-body">
                <h3 className="recipe-title">{r.title}</h3>
                <div className="recipe-meta">
                  {r.area && <span>🌍 {r.area}</span>}
                  {r.category && <span>· {r.category}</span>}
                </div>
                <div className="recipe-actions">
                  <button
                    className="btn tiny primary"
                    disabled={importingId === r.externalId || already}
                    onClick={() => importRecipe(r)}
                  >
                    {already
                      ? "✓"
                      : importingId === r.externalId
                        ? t("importing", lang)
                        : `＋ ${t("importRecipe", lang)}`}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
