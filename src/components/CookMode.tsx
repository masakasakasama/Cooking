import { useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { pick } from "../lib/display";
import { parseTimers, formatClock, type ParsedTimer } from "../lib/timers";
import { scaleIngredients } from "../lib/ingredients";
import type { Lang, Recipe } from "../types";

// ----------------------------------------------------------------------------
// 調理モード: 手順を全画面・1ステップずつ大きく表示。
//  - 画面が消えない（Wake Lock API）
//  - 手順内の「10分」等をタップでタイマー起動（複数同時可）
//  - 人数スケーリングに追従した材料も確認できる
// ----------------------------------------------------------------------------

interface RunningTimer {
  id: number;
  label: string;
  remaining: number;
  total: number;
}

export function CookMode({
  recipe,
  servings,
  lang,
  onClose,
}: {
  recipe: Recipe;
  servings: number;
  lang: Lang;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [timers, setTimers] = useState<RunningTimer[]>([]);
  const [showIngredients, setShowIngredients] = useState(false);
  const timerSeq = useRef(0);
  const base = recipe.servings ?? 2;
  const ingredients = scaleIngredients(recipe.ingredients, base, servings);

  const steps = recipe.steps;
  const step = steps[idx];
  const stepText = step ? pick(step.textJa, step.textDe, lang) : "";
  const chips: ParsedTimer[] = step ? parseTimers(stepText) : [];

  // 画面を消さない（Wake Lock）。失敗しても致命的でないので握りつぶす。
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let released = false;
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        /* noop */
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      try {
        if (lock && !released) void lock.release();
        void lock?.release();
      } catch {
        /* noop */
      }
    };
  }, []);

  // タイマーのカウントダウン
  useEffect(() => {
    if (timers.length === 0) return;
    const h = window.setInterval(() => {
      setTimers((prev) =>
        prev
          .map((tm) => ({ ...tm, remaining: tm.remaining - 1 }))
          .filter((tm) => {
            if (tm.remaining <= 0) {
              // 鳴らす（対応端末のみ）
              try {
                navigator.vibrate?.([200, 100, 200]);
              } catch {
                /* noop */
              }
              return false;
            }
            return true;
          }),
      );
    }, 1000);
    return () => window.clearInterval(h);
  }, [timers.length]);

  const startTimer = (tm: ParsedTimer) => {
    const id = ++timerSeq.current;
    setTimers((prev) => [...prev, { id, label: tm.label, remaining: tm.seconds, total: tm.seconds }]);
  };
  const stopTimer = (id: number) => setTimers((prev) => prev.filter((tm) => tm.id !== id));

  const atEnd = idx >= steps.length - 1;

  return (
    <div className="cook-mode">
      <header className="cook-head">
        <button className="icon-btn light" onClick={onClose} aria-label="close">
          ✕
        </button>
        <div className="cook-title">{pick(recipe.titleJa, recipe.titleDe, lang)}</div>
        <button className="icon-btn light" onClick={() => setShowIngredients((v) => !v)} aria-label="ingredients">
          📋
        </button>
      </header>

      {showIngredients && (
        <div className="cook-ingredients">
          <h4>
            {t("ingredients", lang)} · {servings}
            {t("servingsUnit", lang)}
          </h4>
          <ul>
            {ingredients.map((ing) => (
              <li key={ing.id}>
                <span>{pick(ing.nameJa, ing.nameDe, lang)}</span>
                <span className="muted">{ing.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="cook-body">
        <div className="cook-step-no">
          {t("stepLabel", lang)} {idx + 1} / {steps.length}
        </div>
        <p className="cook-step-text">{stepText}</p>

        {chips.length > 0 && (
          <div className="cook-timer-chips">
            {chips.map((c, i) => (
              <button key={i} className="timer-chip" onClick={() => startTimer(c)}>
                ⏱ {c.label} {t("startTimer", lang)}
              </button>
            ))}
          </div>
        )}
      </div>

      {timers.length > 0 && (
        <div className="cook-timers">
          {timers.map((tm) => (
            <div key={tm.id} className={`running-timer ${tm.remaining <= 5 ? "soon" : ""}`}>
              <span className="rt-label">{tm.label}</span>
              <span className="rt-clock">{formatClock(tm.remaining)}</span>
              <button className="icon-btn light" onClick={() => stopTimer(tm.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <footer className="cook-nav">
        <button className="btn block" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>
          ← {t("prevStep", lang)}
        </button>
        {atEnd ? (
          <button className="btn block primary" onClick={onClose}>
            ✓ {t("finishCooking", lang)}
          </button>
        ) : (
          <button className="btn block primary" onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}>
            {t("nextStep", lang)} →
          </button>
        )}
      </footer>
    </div>
  );
}
