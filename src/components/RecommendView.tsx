import { useMemo, useState } from "react";
import { useSpace } from "../store/SpaceContext";
import { t } from "../i18n";
import { pick } from "../lib/display";
import { newId } from "../lib/id";
import { FIXED_SPACE_ID } from "../lib/appConfig";
import {
  buildMenu,
  recommendCurated,
  todaySeed,
  type MenuPlan,
} from "../lib/recommendCurated";
import { aggregateIngredients } from "../lib/ingredients";
import type { Recipe, ShoppingItem } from "../types";
import { RecipeDetail } from "./RecipeDetail";

// ----------------------------------------------------------------------------
// おすすめ: 日本で作りやすい厳選レシピから、好み・旬を反映して提案する。
//  - 今日の献立（主菜+副菜+汁物）
//  - 今日のおすすめ一覧
// 外部APIに依存しないので「ラム肉のすね煮込み」のような作れない料理は出ない。
// ----------------------------------------------------------------------------
export function RecommendView() {
  const { lang, store, preferences } = useSpace();
  const [menuSeed, setMenuSeed] = useState(0);
  const [recSeed, setRecSeed] = useState(0);
  const [detail, setDetail] = useState<Recipe | null>(null);
  const [toast, setToast] = useState("");

  const month = new Date().getMonth() + 1;

  const menu: MenuPlan = useMemo(
    () => buildMenu(preferences, `${todaySeed(FIXED_SPACE_ID)}:menu:${menuSeed}`),
    [preferences, menuSeed],
  );

  const recs = useMemo(
    () => recommendCurated(preferences, `${todaySeed(FIXED_SPACE_ID)}:rec:${recSeed}`, 12),
    [preferences, recSeed],
  );

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  // 献立の全材料をまとめて買い物リストへ（同じ食材は集約）
  const menuToShopping = async () => {
    if (!store) return;
    const dishes = [menu.main, menu.side, menu.soup].filter(Boolean) as Recipe[];
    const rows = dishes.flatMap((d) =>
      d.ingredients.map((i) => ({
        nameJa: i.nameJa,
        nameDe: i.nameDe,
        amount: i.amount,
        recipeId: d.id,
      })),
    );
    const merged = aggregateIngredients(rows);
    const now = Date.now();
    for (const m of merged) {
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

  return (
    <div className="view">
      {/* 今日の献立 */}
      <div className="view-toolbar">
        <h2 className="view-title">🍱 {t("todaysMenu", lang)}</h2>
        <button className="btn small ghost" onClick={() => setMenuSeed((s) => s + 1)}>
          🔄 {t("anotherMenu", lang)}
        </button>
      </div>

      <div className="menu-plan">
        {(["main", "side", "soup"] as const).map((slot) => {
          const r = menu[slot];
          return (
            <button
              key={slot}
              className="menu-slot"
              onClick={() => r && setDetail(r)}
              disabled={!r}
            >
              <span className="menu-slot-role">{t(`role_${slot}`, lang)}</span>
              {r ? (
                <>
                  <span className="menu-slot-emoji">{r.emoji ?? "🍽️"}</span>
                  <span className="menu-slot-name">{pick(r.titleJa, r.titleDe, lang)}</span>
                  <span className="menu-slot-time">
                    ⏱ {r.timeMinutes}
                    {t("minutesShort", lang)}
                  </span>
                </>
              ) : (
                <span className="muted">—</span>
              )}
            </button>
          );
        })}
      </div>
      <button className="btn primary block" onClick={menuToShopping}>
        🛒 {t("menuToShopping", lang)}
      </button>

      {/* 今日のおすすめ */}
      <div className="view-toolbar mt">
        <h3 className="discover-section">✨ {t("todaysRecommend", lang)}</h3>
        <button className="btn small ghost" onClick={() => setRecSeed((s) => s + 1)}>
          🔄 {t("regenerate", lang)}
        </button>
      </div>

      <ul className="recipe-grid">
        {recs.map(({ recipe: r, reasonJa, reasonDe, inSeason }) => (
          <li key={r.id} className="recipe-card tappable" onClick={() => setDetail(r)}>
            <div className="recipe-thumb">
              {r.imageDataUrl ? (
                <img src={r.imageDataUrl} alt="" loading="lazy" />
              ) : (
                <span className="thumb-placeholder">{r.emoji ?? "🍽️"}</span>
              )}
              {inSeason && <span className="season-chip">🍂 {t("inSeason", lang)}</span>}
            </div>
            <div className="recipe-body">
              <h3 className="recipe-title">{pick(r.titleJa, r.titleDe, lang)}</h3>
              <div className="recipe-meta">
                <span>
                  ⏱ {r.timeMinutes}
                  {t("minutesShort", lang)}
                </span>
                <span>· {t(r.difficulty, lang)}</span>
              </div>
              <p className="rec-reason">{lang === "ja" ? reasonJa : reasonDe}</p>
            </div>
          </li>
        ))}
      </ul>

      {detail && <RecipeDetail recipe={detail} onClose={() => setDetail(null)} />}
      {toast && <div className="toast">{toast}</div>}
      <p className="hint center small">
        {lang === "ja"
          ? `${month}月の旬や好み設定を反映しています。`
          : `Berücksichtigt Saison (Monat ${month}) und Vorlieben.`}
      </p>
    </div>
  );
}
