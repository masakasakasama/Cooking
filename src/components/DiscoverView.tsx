import { useEffect, useMemo, useRef, useState } from "react";
import { useSpace } from "../store/SpaceContext";
import { t } from "../i18n";
import {
  lookupMeal,
  mealToRecipe,
  searchRecipes,
  type SearchResult,
} from "../lib/recipeSearch";
import { analyzeImageToRecipe, isAiConfigured } from "../lib/aiAnalyze";
import { compressImageToDataUrl } from "../lib/image";
import { matchByIngredients } from "../lib/recommendCurated";
import { pick } from "../lib/display";
import type { Recipe } from "../types";
import { RecipeDetail } from "./RecipeDetail";

type Mode = "fridge" | "world";

// ----------------------------------------------------------------------------
// さがす:
//  1) AI: 料理写真からレシピを自動生成
//  2) 冷蔵庫にあるもので作れる料理（厳選レシピから / 日本で作れるものだけ）
//  3) キーワードで世界のレシピ検索（TheMealDB）
// ----------------------------------------------------------------------------
export function DiscoverView() {
  const { lang, store, recipes, preferences } = useSpace();
  const [mode, setMode] = useState<Mode>("fridge");

  // --- AI 写真 ---
  const [aiBusy, setAiBusy] = useState(false);
  const aiFileRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState("");

  // --- 冷蔵庫（食材から） ---
  const [haveText, setHaveText] = useState("");
  const have = useMemo(
    () =>
      haveText
        .split(/[,、\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [haveText],
  );
  const matches = useMemo(
    () => (have.length ? matchByIngredients(have, preferences) : []),
    [have, preferences],
  );
  const [detail, setDetail] = useState<Recipe | null>(null);

  // --- 世界のレシピ（TheMealDB） ---
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importedTitles = new Set(recipes.map((r) => r.titleJa.toLowerCase()));

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  const runWorld = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResults(await searchRecipes(q));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== "world") return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void runWorld(query), 450);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, mode]);

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

  const importWorld = async (r: SearchResult) => {
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
      <h2 className="view-title">{t("discoverTitle", lang)}</h2>

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

      {/* モード切替 */}
      <div className="seg">
        <button className={`seg-btn ${mode === "fridge" ? "active" : ""}`} onClick={() => setMode("fridge")}>
          🧊 {t("fridgeMode", lang)}
        </button>
        <button className={`seg-btn ${mode === "world" ? "active" : ""}`} onClick={() => setMode("world")}>
          🌍 {t("worldMode", lang)}
        </button>
      </div>

      {mode === "fridge" ? (
        <>
          <p className="hint">{t("fridgeHint", lang)}</p>
          <input
            className="search block-search"
            placeholder={t("fridgePlaceholder", lang)}
            value={haveText}
            onChange={(e) => setHaveText(e.target.value)}
          />
          {have.length === 0 ? (
            <p className="empty">{t("fridgeEmpty", lang)}</p>
          ) : matches.length === 0 ? (
            <p className="empty">{t("fridgeNoMatch", lang)}</p>
          ) : (
            <ul className="recipe-grid">
              {matches.slice(0, 12).map(({ recipe: r, have: h, missing }) => (
                <li key={r.id} className="recipe-card tappable" onClick={() => setDetail(r)}>
                  <div className="recipe-thumb">
                    <span className="thumb-placeholder">{r.emoji ?? "🍽️"}</span>
                    {missing.length === 0 ? (
                      <span className="season-chip can-make">✓ {t("canMake", lang)}</span>
                    ) : (
                      <span className="season-chip">
                        {t("missingN", lang).replace("{n}", String(missing.length))}
                      </span>
                    )}
                  </div>
                  <div className="recipe-body">
                    <h3 className="recipe-title">{pick(r.titleJa, r.titleDe, lang)}</h3>
                    <div className="recipe-meta">
                      <span>
                        ⏱ {r.timeMinutes}
                        {t("minutesShort", lang)}
                      </span>
                    </div>
                    <p className="rec-reason">
                      <span className="have-tags">{h.map((x) => `✓${x}`).join(" ")}</span>
                      {missing.length > 0 && (
                        <span className="miss-tags"> {missing.map((x) => `+${x}`).join(" ")}</span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <p className="hint">{t("discoverHint", lang)}</p>
          <input
            className="search block-search"
            placeholder={t("discoverSearchPlaceholder", lang)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <p className="hint center">…</p>}
          {error && <p className="empty">{error}</p>}
          {!loading && !error && query.trim() && results.length === 0 && (
            <p className="empty">{t("discoverEmpty", lang)}</p>
          )}
          <ul className="recipe-grid">
            {results.map((r) => {
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
                        onClick={() => importWorld(r)}
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
        </>
      )}

      {detail && <RecipeDetail recipe={detail} onClose={() => setDetail(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
