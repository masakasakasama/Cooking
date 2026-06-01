import { useRef, useState } from "react";
import { useSpace } from "../store/SpaceContext";
import { t } from "../i18n";
import { ALL_STATUSES, statusLabel } from "../lib/display";
import { newId } from "../lib/id";
import { compressImageToDataUrl, dataUrlBytes } from "../lib/image";
import { ALL_DISH_CATEGORIES, type CookingStep, type Difficulty, type DishCategory, type Ingredient, type Recipe } from "../types";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function blankIngredient(order: number): Ingredient {
  return { id: newId(), nameJa: "", nameDe: "", amount: "", order };
}
function blankStep(order: number): CookingStep {
  return { id: newId(), textJa: "", textDe: "", order };
}

function emptyRecipe(): Recipe {
  const now = Date.now();
  return {
    id: newId(),
    titleJa: "",
    titleDe: "",
    sourceUrl: "",
    imageDataUrl: "",
    timeMinutes: 0,
    difficulty: "medium",
    tags: [],
    status: "want",
    memo: "",
    ingredients: [blankIngredient(0)],
    steps: [blankStep(0)],
    createdAt: now,
    updatedAt: now,
  };
}

// レシピ作成 / 編集モーダル
export function RecipeEditor({ recipe, onClose }: { recipe: Recipe | null; onClose: () => void }) {
  const { lang, store } = useSpace();
  const [draft, setDraft] = useState<Recipe>(() =>
    recipe ? structuredClone(recipe) : emptyRecipe(),
  );
  const [tagsText, setTagsText] = useState(recipe?.tags.join(", ") ?? "");
  const [imgInfo, setImgInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Recipe>(key: K, val: Recipe[K]) =>
    setDraft((d) => ({ ...d, [key]: val }));

  const onPickImage = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setImgInfo("圧縮中… / Komprimiere…");
    try {
      const dataUrl = await compressImageToDataUrl(file);
      const kb = Math.round(dataUrlBytes(dataUrl) / 1024);
      set("imageDataUrl", dataUrl);
      setImgInfo(`${kb} KB`);
    } catch (e) {
      console.error(e);
      setImgInfo("画像の処理に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  // 材料
  const updateIngredient = (id: string, patch: Partial<Ingredient>) =>
    set(
      "ingredients",
      draft.ingredients.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    );
  const addIngredient = () =>
    set("ingredients", [...draft.ingredients, blankIngredient(draft.ingredients.length)]);
  const removeIngredient = (id: string) =>
    set("ingredients", draft.ingredients.filter((i) => i.id !== id));

  // 手順
  const updateStep = (id: string, patch: Partial<CookingStep>) =>
    set(
      "steps",
      draft.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  const addStep = () => set("steps", [...draft.steps, blankStep(draft.steps.length)]);
  const removeStep = (id: string) => set("steps", draft.steps.filter((s) => s.id !== id));

  const save = async () => {
    if (!store) return;
    const tags = tagsText
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const cleaned: Recipe = {
      ...draft,
      tags,
      ingredients: draft.ingredients
        .filter((i) => i.nameJa || i.nameDe || i.amount)
        .map((i, idx) => ({ ...i, order: idx })),
      steps: draft.steps
        .filter((s) => s.textJa || s.textDe)
        .map((s, idx) => ({ ...s, order: idx })),
      updatedAt: Date.now(),
    };
    setBusy(true);
    try {
      await store.upsertRecipe(cleaned);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{recipe ? t("editRecipe", lang) : t("addRecipe", lang)}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="close">
            ✕
          </button>
        </header>

        <div className="modal-body">
          <div className="grid-2">
            <label className="field">
              <span>{t("titleJa", lang)}</span>
              <input value={draft.titleJa} onChange={(e) => set("titleJa", e.target.value)} />
            </label>
            <label className="field">
              <span>{t("titleDe", lang)}</span>
              <input value={draft.titleDe} onChange={(e) => set("titleDe", e.target.value)} />
            </label>
          </div>

          <label className="field">
            <span>{t("sourceUrl", lang)}</span>
            <input
              type="url"
              placeholder="https://…"
              value={draft.sourceUrl}
              onChange={(e) => set("sourceUrl", e.target.value)}
            />
          </label>

          <div className="field">
            <span>{t("image", lang)}</span>
            <div className="image-row">
              {draft.imageDataUrl ? (
                <img className="image-preview" src={draft.imageDataUrl} alt="" />
              ) : (
                <div className="image-preview empty">🍽️</div>
              )}
              <div className="image-controls">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => onPickImage(e.target.files?.[0])}
                />
                <button className="btn small" type="button" onClick={() => fileRef.current?.click()}>
                  📷 選択
                </button>
                {draft.imageDataUrl && (
                  <button className="btn small ghost" type="button" onClick={() => set("imageDataUrl", "")}>
                    {t("delete", lang)}
                  </button>
                )}
                <small className="muted">{imgInfo || "≤200KB に自動圧縮"}</small>
              </div>
            </div>
          </div>

          <div className="grid-3">
            <label className="field">
              <span>{t("category", lang)}</span>
              <select
                value={draft.category ?? ""}
                onChange={(e) => set("category", (e.target.value || undefined) as DishCategory | undefined)}
              >
                <option value="">—</option>
                {ALL_DISH_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`cat_${c}`, lang)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("servings", lang)}</span>
              <input
                type="number"
                min={1}
                value={draft.servings ?? ""}
                placeholder="2"
                onChange={(e) => set("servings", Number(e.target.value) || undefined)}
              />
            </label>
            <label className="field">
              <span>{t("timeMinutes", lang)}</span>
              <input
                type="number"
                min={0}
                value={draft.timeMinutes || ""}
                onChange={(e) => set("timeMinutes", Number(e.target.value) || 0)}
              />
            </label>
          </div>

          <div className="grid-2">
            <label className="field">
              <span>{t("difficulty", lang)}</span>
              <select
                value={draft.difficulty}
                onChange={(e) => set("difficulty", e.target.value as Difficulty)}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {t(d, lang)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("statusWant", lang).split(" ")[0] || "Status"}</span>
              <select
                value={draft.status}
                onChange={(e) => set("status", e.target.value as Recipe["status"])}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s, lang)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>
              {t("tags", lang)} <small className="muted">({t("tagsHint", lang)})</small>
            </span>
            <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="和食, 時短" />
          </label>

          {/* 材料 */}
          <section className="editor-section">
            <div className="section-head">
              <h3>{t("ingredients", lang)}</h3>
              <button className="btn tiny" type="button" onClick={addIngredient}>
                ＋ {t("addIngredient", lang)}
              </button>
            </div>
            {draft.ingredients.map((ing) => (
              <div key={ing.id} className="row-line">
                <input
                  placeholder={`${t("name", lang)} (JA)`}
                  value={ing.nameJa}
                  onChange={(e) => updateIngredient(ing.id, { nameJa: e.target.value })}
                />
                <input
                  placeholder={`${t("name", lang)} (DE)`}
                  value={ing.nameDe}
                  onChange={(e) => updateIngredient(ing.id, { nameDe: e.target.value })}
                />
                <input
                  className="amount-input"
                  placeholder={t("amount", lang)}
                  value={ing.amount}
                  onChange={(e) => updateIngredient(ing.id, { amount: e.target.value })}
                />
                <button className="icon-btn" type="button" onClick={() => removeIngredient(ing.id)}>
                  ✕
                </button>
              </div>
            ))}
          </section>

          {/* 手順 */}
          <section className="editor-section">
            <div className="section-head">
              <h3>{t("steps", lang)}</h3>
              <button className="btn tiny" type="button" onClick={addStep}>
                ＋ {t("addStep", lang)}
              </button>
            </div>
            {draft.steps.map((s, idx) => (
              <div key={s.id} className="row-line step">
                <span className="step-no">{idx + 1}</span>
                <textarea
                  placeholder="(JA)"
                  rows={2}
                  value={s.textJa}
                  onChange={(e) => updateStep(s.id, { textJa: e.target.value })}
                />
                <textarea
                  placeholder="(DE)"
                  rows={2}
                  value={s.textDe}
                  onChange={(e) => updateStep(s.id, { textDe: e.target.value })}
                />
                <button className="icon-btn" type="button" onClick={() => removeStep(s.id)}>
                  ✕
                </button>
              </div>
            ))}
          </section>

          <label className="field">
            <span>{t("memo", lang)}</span>
            <textarea rows={2} value={draft.memo} onChange={(e) => set("memo", e.target.value)} />
          </label>
        </div>

        <footer className="modal-footer">
          <button className="btn ghost" onClick={onClose} disabled={busy}>
            {t("cancel", lang)}
          </button>
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? "…" : t("save", lang)}
          </button>
        </footer>
      </div>
    </div>
  );
}
