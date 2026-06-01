import { useMemo, useState } from "react";
import { useSpace } from "../store/SpaceContext";
import { t } from "../i18n";
import { pick, statusLabel } from "../lib/display";
import { newId } from "../lib/id";
import { aggregateIngredients } from "../lib/ingredients";
import { ALL_DISH_CATEGORIES, type DishCategory, type Recipe, type ShoppingItem } from "../types";
import { RecipeEditor } from "./RecipeEditor";
import { RecipeDetail } from "./RecipeDetail";

type Sort = "recent" | "cooked" | "time";

export function RecipesView() {
  const { lang, recipes, store } = useSpace();
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Recipe | null>(null);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<DishCategory | "all">("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [toast, setToast] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = recipes.filter((r) => {
      if (cat !== "all" && r.category !== cat) return false;
      if (!q) return true;
      return `${r.titleJa} ${r.titleDe} ${r.tags.join(" ")}`.toLowerCase().includes(q);
    });
    list = [...list].sort((a, b) => {
      if (sort === "cooked") return (b.cookedCount ?? 0) - (a.cookedCount ?? 0);
      if (sort === "time") return (a.timeMinutes || 999) - (b.timeMinutes || 999);
      return b.updatedAt - a.updatedAt;
    });
    return list;
  }, [recipes, search, cat, sort]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  // 重複食材はまとめて買い物リストへ
  const addIngredientsToShopping = async (recipe: Recipe) => {
    if (!store) return;
    const merged = aggregateIngredients(
      recipe.ingredients.map((i) => ({
        nameJa: i.nameJa,
        nameDe: i.nameDe,
        amount: i.amount,
        recipeId: recipe.id,
      })),
    );
    const now = Date.now();
    for (const m of merged) {
      if (!m.nameJa && !m.nameDe) continue;
      const item: ShoppingItem = {
        id: newId(),
        nameJa: m.nameJa,
        nameDe: m.nameDe,
        amount: m.amount,
        checked: false,
        recipeIds: m.recipeIds,
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

      {/* カテゴリ絞り込み */}
      <div className="chip-row">
        <button className={`chip ${cat === "all" ? "active" : ""}`} onClick={() => setCat("all")}>
          {t("catAll", lang)}
        </button>
        {ALL_DISH_CATEGORIES.map((c) => (
          <button key={c} className={`chip ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>
            {t(`cat_${c}`, lang)}
          </button>
        ))}
      </div>

      {/* 並び替え */}
      <div className="sort-row">
        <span className="muted small">{t("sortBy", lang)}:</span>
        {(["recent", "cooked", "time"] as const).map((s) => (
          <button key={s} className={`linkbtn ${sort === s ? "active" : ""}`} onClick={() => setSort(s)}>
            {t(`sort_${s}`, lang)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty">{t("emptyRecipes", lang)}</p>
      ) : (
        <ul className="recipe-grid">
          {filtered.map((r) => (
            <li key={r.id} className="recipe-card">
              <div className="recipe-thumb tappable" onClick={() => setDetail(r)}>
                {r.imageDataUrl ? (
                  <img src={r.imageDataUrl} alt="" loading="lazy" />
                ) : (
                  <span className="thumb-placeholder">{r.emoji ?? "🍽️"}</span>
                )}
                <span className={`status-chip ${r.status}`}>{statusLabel(r.status, lang)}</span>
              </div>
              <div className="recipe-body">
                <h3 className="recipe-title tappable" onClick={() => setDetail(r)}>
                  {pick(r.titleJa, r.titleDe, lang) || "—"}
                </h3>
                <div className="recipe-meta">
                  {r.timeMinutes > 0 && (
                    <span>
                      ⏱ {r.timeMinutes}
                      {t("minutesShort", lang)}
                    </span>
                  )}
                  <span>· {t(`${r.difficulty}` as "easy" | "medium" | "hard", lang)}</span>
                  {r.cookedCount ? <span>· 🍳×{r.cookedCount}</span> : null}
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
                <div className="recipe-actions">
                  <button className="btn tiny primary" onClick={() => setDetail(r)}>
                    👨‍🍳 {t("startCooking", lang)}
                  </button>
                  <button className="btn tiny" onClick={() => addIngredientsToShopping(r)}>
                    🛒
                  </button>
                  <button className="btn tiny" onClick={() => setEditing(r)}>
                    ✏️
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

      {detail && (
        <RecipeDetail
          recipe={detail}
          onClose={() => setDetail(null)}
          onEdit={(r) => {
            setDetail(null);
            setEditing(r);
          }}
        />
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
    </div>
  );
}
