import { useMemo, useState } from "react";
import { useSpace } from "../store/SpaceContext";
import { t } from "../i18n";
import { ALL_STATUSES, pick, statusLabel } from "../lib/display";
import { newId } from "../lib/id";
import type { Recipe, ShoppingItem } from "../types";
import { RecipeEditor } from "./RecipeEditor";

export function RecipesView() {
  const { lang, recipes, store } = useSpace();
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) =>
      `${r.titleJa} ${r.titleDe} ${r.tags.join(" ")}`.toLowerCase().includes(q),
    );
  }, [recipes, search]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  const addIngredientsToShopping = async (recipe: Recipe) => {
    if (!store) return;
    const now = Date.now();
    for (const ing of recipe.ingredients) {
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

  const remove = async (r: Recipe) => {
    if (!store) return;
    if (window.confirm(t("confirmDelete", lang))) await store.deleteRecipe(r.id);
  };

  return (
    <div className="view">
      <div className="view-toolbar">
        <input
          className="search"
          placeholder={`🔎 ${t("search", lang)}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn primary" onClick={() => setCreating(true)}>
          ＋ {t("addRecipe", lang)}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">{t("emptyRecipes", lang)}</p>
      ) : (
        <ul className="recipe-grid">
          {filtered.map((r) => (
            <li key={r.id} className="recipe-card">
              <div className="recipe-thumb">
                {r.imageDataUrl ? (
                  <img src={r.imageDataUrl} alt="" loading="lazy" />
                ) : (
                  <span className="thumb-placeholder">🍽️</span>
                )}
                <span className={`status-chip ${r.status}`}>{statusLabel(r.status, lang)}</span>
              </div>
              <div className="recipe-body">
                <h3 className="recipe-title">{pick(r.titleJa, r.titleDe, lang) || "—"}</h3>
                <div className="recipe-meta">
                  {r.timeMinutes > 0 && (
                    <span>
                      ⏱ {r.timeMinutes}
                      {t("minutesShort", lang)}
                    </span>
                  )}
                  <span>· {t(`${r.difficulty}` as "easy" | "medium" | "hard", lang)}</span>
                </div>
                {r.tags.length > 0 && (
                  <div className="tags">
                    {r.tags.map((tg) => (
                      <span key={tg} className="tag">
                        #{tg}
                      </span>
                    ))}
                  </div>
                )}
                {r.sourceUrl && (
                  <a className="source-link" href={r.sourceUrl} target="_blank" rel="noreferrer">
                    🔗 {new URL(r.sourceUrl).hostname.replace("www.", "")}
                  </a>
                )}
                <div className="recipe-actions">
                  <button className="btn tiny" onClick={() => setEditing(r)}>
                    ✏️ {t("edit", lang)}
                  </button>
                  <button className="btn tiny" onClick={() => addIngredientsToShopping(r)}>
                    🛒 {t("addToShopping", lang)}
                  </button>
                  <button className="btn tiny danger" onClick={() => remove(r)}>
                    🗑
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(creating || editing) && (
        <RecipeEditor
          recipe={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      <p className="hint center small">
        {ALL_STATUSES.map((s) => statusLabel(s, lang)).join(" · ")}
      </p>
    </div>
  );
}
