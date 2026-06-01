import { useState } from "react";
import { useSpace } from "../store/SpaceContext";
import { t } from "../i18n";
import { pick, statusLabel } from "../lib/display";
import { newId } from "../lib/id";
import { scaleIngredients } from "../lib/ingredients";
import { cloneCuratedForSave } from "../data/curatedRecipes";
import type { Recipe, ShoppingItem } from "../types";
import { CookMode } from "./CookMode";

// ----------------------------------------------------------------------------
// レシピ詳細: 材料(人数スケーリング付き)・手順を表示し、調理モードを開始できる。
// 厳選レシピ(curated:*)はまだ自分のレシピに無いので「追加」で保存できる。
// ----------------------------------------------------------------------------
export function RecipeDetail({
  recipe,
  onClose,
  onEdit,
}: {
  recipe: Recipe;
  onClose: () => void;
  onEdit?: (r: Recipe) => void;
}) {
  const { lang, store, recipes } = useSpace();
  const base = recipe.servings ?? 2;
  const [servings, setServings] = useState(base);
  const [cooking, setCooking] = useState(false);
  const [toast, setToast] = useState("");

  const isCurated = recipe.id.startsWith("curated:");
  const alreadySaved = recipes.some(
    (r) => r.titleJa === recipe.titleJa && r.titleJa !== "",
  );
  const scaled = scaleIngredients(recipe.ingredients, base, servings);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  const saveToMine = async () => {
    if (!store) return;
    await store.upsertRecipe(cloneCuratedForSave(recipe, newId));
    flash(t("imported", lang));
  };

  const addToShopping = async () => {
    if (!store) return;
    const now = Date.now();
    for (const ing of scaled) {
      if (!ing.nameJa && !ing.nameDe) continue;
      const item: ShoppingItem = {
        id: newId(),
        nameJa: ing.nameJa,
        nameDe: ing.nameDe,
        amount: ing.amount,
        checked: false,
        recipeIds: [recipe.id],
        createdAt: now,
        updatedAt: now,
      };
      await store.upsertShoppingItem(item);
    }
    flash(t("addedToShopping", lang));
  };

  // 「作った」: 回数を増やし、ステータスを cooked に（自分のレシピのみ）。
  const markCooked = async () => {
    if (!store || isCurated) return;
    await store.upsertRecipe({
      ...recipe,
      status: "cooked",
      cookedCount: (recipe.cookedCount ?? 0) + 1,
      lastCookedAt: Date.now(),
      updatedAt: Date.now(),
    });
    flash(t("markedCooked", lang));
  };

  if (cooking) {
    return (
      <CookMode
        recipe={recipe}
        servings={servings}
        lang={lang}
        onClose={() => setCooking(false)}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{pick(recipe.titleJa, recipe.titleDe, lang) || "—"}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="close">
            ✕
          </button>
        </header>

        <div className="modal-body">
          <div className="detail-hero">
            {recipe.imageDataUrl ? (
              <img className="detail-img" src={recipe.imageDataUrl} alt="" />
            ) : (
              <div className="detail-img empty">{recipe.emoji ?? "🍽️"}</div>
            )}
            <div className="detail-meta">
              {recipe.timeMinutes > 0 && (
                <span>
                  ⏱ {recipe.timeMinutes}
                  {t("minutesShort", lang)}
                </span>
              )}
              <span>· {t(recipe.difficulty, lang)}</span>
              {!isCurated && <span>· {statusLabel(recipe.status, lang)}</span>}
              {recipe.cookedCount ? <span>· 🍳×{recipe.cookedCount}</span> : null}
            </div>
            {recipe.tags.length > 0 && (
              <div className="tags">
                {recipe.tags.map((tg) => (
                  <span key={tg} className="tag">
                    #{tg}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 人数スケーリング */}
          <div className="servings-row">
            <span>{t("servings", lang)}</span>
            <div className="stepper">
              <button onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="minus">
                −
              </button>
              <strong>
                {servings}
                {t("servingsUnit", lang)}
              </strong>
              <button onClick={() => setServings((s) => Math.min(12, s + 1))} aria-label="plus">
                ＋
              </button>
            </div>
            {servings !== base && (
              <span className="muted small">
                ({base}
                {t("servingsUnit", lang)} → {servings}
                {t("servingsUnit", lang)})
              </span>
            )}
          </div>

          {/* 材料 */}
          <section className="editor-section">
            <h3>{t("ingredients", lang)}</h3>
            <ul className="detail-ings">
              {scaled.map((ing) => (
                <li key={ing.id}>
                  <span>{pick(ing.nameJa, ing.nameDe, lang)}</span>
                  <span className="muted">{ing.amount}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 手順 */}
          <section className="editor-section">
            <h3>{t("steps", lang)}</h3>
            <ol className="detail-steps">
              {recipe.steps.map((s) => (
                <li key={s.id}>{pick(s.textJa, s.textDe, lang)}</li>
              ))}
            </ol>
          </section>

          {recipe.memo && (
            <section className="editor-section">
              <h3>{t("memo", lang)}</h3>
              <p className="detail-memo">{recipe.memo}</p>
            </section>
          )}

          {recipe.sourceUrl && (
            <a className="source-link" href={recipe.sourceUrl} target="_blank" rel="noreferrer">
              🔗 {t("sourceUrl", lang)}
            </a>
          )}
        </div>

        <footer className="modal-footer wrap">
          {recipe.steps.length > 0 && (
            <button className="btn primary" onClick={() => setCooking(true)}>
              👨‍🍳 {t("startCooking", lang)}
            </button>
          )}
          <button className="btn" onClick={addToShopping}>
            🛒 {t("addToShopping", lang)}
          </button>
          {isCurated ? (
            <button className="btn" onClick={saveToMine} disabled={alreadySaved}>
              {alreadySaved ? "✓" : `＋ ${t("importRecipe", lang)}`}
            </button>
          ) : (
            <>
              <button className="btn" onClick={markCooked}>
                🍳 {t("markCooked", lang)}
              </button>
              {onEdit && (
                <button className="btn ghost" onClick={() => onEdit(recipe)}>
                  ✏️ {t("edit", lang)}
                </button>
              )}
            </>
          )}
        </footer>

        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}
