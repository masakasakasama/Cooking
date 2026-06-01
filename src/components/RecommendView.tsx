import { useEffect, useRef, useState } from "react";
import { useSpace } from "../store/SpaceContext";
import { t } from "../i18n";
import {
  lookupMeal,
  mealToRecipe,
  recommendRecipes,
  type SearchResult,
} from "../lib/recipeSearch";

// ----------------------------------------------------------------------------
// おすすめ: 外部レシピDB(TheMealDB)から料理をまとめて表示する。
// 好み設定があればそれを反映、無ければ幅広く出す。タブを開くとすぐ料理が並ぶ。
// ----------------------------------------------------------------------------
export function RecommendView() {
  const { lang, store, recipes, preferences } = useSpace();
  const [items, setItems] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const reqId = useRef(0);

  const importedTitles = new Set(recipes.map((r) => r.titleJa.toLowerCase()));

  const load = async () => {
    const my = ++reqId.current;
    setLoading(true);
    setError("");
    try {
      // 好み設定ベースで多めに取得（学習・検索の前にまず料理を並べる）
      const res = await recommendRecipes({
        favorite: preferences.favoriteIngredients,
        disliked: preferences.dislikedIngredients,
        forbidden: preferences.forbiddenIngredients,
        count: 12,
      });
      if (my === reqId.current) setItems(res);
    } catch (e) {
      if (my === reqId.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (my === reqId.current) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  const importRecipe = async (r: SearchResult) => {
    if (!store) return;
    setImportingId(r.externalId);
    try {
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

  return (
    <div className="view">
      <div className="view-toolbar">
        <h2 className="view-title">{t("todaysRecommend", lang)}</h2>
        <button className="btn small ghost" onClick={() => load()} disabled={loading}>
          🔄 {t("regenerate", lang)}
        </button>
      </div>

      {loading && <p className="hint center">…</p>}
      {error && <p className="empty">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="empty">{t("noRecommend", lang)}</p>
      )}

      <ul className="recipe-grid">
        {items.map((r) => {
          const already = importedTitles.has(r.title.toLowerCase());
          return (
            <li key={r.externalId} className="recipe-card">
              <div className="recipe-thumb">
                {r.thumb ? (
                  <img src={r.thumb} alt="" loading="lazy" />
                ) : (
                  <span className="thumb-placeholder">🍽️</span>
                )}
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
      <p className="hint center small">{t("recommendStubNote", lang)}</p>
    </div>
  );
}
