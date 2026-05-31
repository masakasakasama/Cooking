import { useEffect, useState } from "react";
import { useSpace } from "../store/SpaceContext";
import { t } from "../i18n";
import type { Preferences } from "../types";

// カンマ区切り入力 <-> string[]
function ListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [text, setText] = useState(value.join(", "));
  useEffect(() => setText(value.join(", ")), [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() =>
          onChange(
            text
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
          )
        }
        placeholder="カンマ区切り / mit Komma"
      />
    </label>
  );
}

export function PreferencesView() {
  const { lang, preferences, store } = useSpace();
  const [draft, setDraft] = useState<Preferences>(preferences);
  const [saved, setSaved] = useState(false);

  // 同期で外部から更新されたら反映（編集中の取りこぼしを避けるため updatedAt で判定）
  useEffect(() => {
    setDraft(preferences);
  }, [preferences.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Preferences>(key: K, val: Preferences[K]) =>
    setDraft((d) => ({ ...d, [key]: val }));

  const save = async () => {
    if (!store) return;
    await store.savePreferences(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="view">
      <h2 className="view-title">{t("preferences", lang)}</h2>

      <ListField
        label={t("favoriteIngredients", lang)}
        value={draft.favoriteIngredients}
        onChange={(v) => set("favoriteIngredients", v)}
      />
      <ListField
        label={t("dislikedIngredients", lang)}
        value={draft.dislikedIngredients}
        onChange={(v) => set("dislikedIngredients", v)}
      />
      <ListField
        label={t("forbiddenIngredients", lang)}
        value={draft.forbiddenIngredients}
        onChange={(v) => set("forbiddenIngredients", v)}
      />
      <ListField
        label={t("preferredGenres", lang)}
        value={draft.preferredGenres}
        onChange={(v) => set("preferredGenres", v)}
      />

      <label className="field">
        <span>{t("maxCookingTime", lang)}</span>
        <input
          type="number"
          min={0}
          value={draft.maxCookingTimeMinutes}
          onChange={(e) => set("maxCookingTimeMinutes", Number(e.target.value) || 0)}
        />
      </label>

      <button className="btn primary block" onClick={save}>
        {saved ? `✓ ${t("saved", lang)}` : t("save", lang)}
      </button>
    </div>
  );
}
