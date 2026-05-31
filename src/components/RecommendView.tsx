import { useMemo, useState } from "react";
import { useSpace } from "../store/SpaceContext";
import { t } from "../i18n";
import { pick } from "../lib/display";
import { computeRecommendations, todaySeed } from "../lib/recommend";

export function RecommendView() {
  const { lang, recipes, preferences, spaceId } = useSpace();
  const [nonce, setNonce] = useState(0);

  // 日付 + spaceId をシードにするので、同じ日・同じスペースなら両端末で同じ並び。
  const seed = useMemo(() => `${todaySeed(spaceId)}#${nonce}`, [spaceId, nonce]);
  const recs = useMemo(
    () => computeRecommendations(recipes, preferences, seed, 3),
    [recipes, preferences, seed],
  );

  return (
    <div className="view">
      <div className="view-toolbar">
        <h2 className="view-title">{t("todaysRecommend", lang)}</h2>
        <button className="btn small ghost" onClick={() => setNonce((n) => n + 1)}>
          🔄 {t("regenerate", lang)}
        </button>
      </div>

      {recs.length === 0 ? (
        <p className="empty">{t("noRecommend", lang)}</p>
      ) : (
        <ul className="rec-list">
          {recs.map((r, idx) => (
            <li key={r.id} className="rec-card">
              <span className="rec-rank">{idx + 1}</span>
              <div className="rec-body">
                <h3>{pick(r.titleJa, r.titleDe, lang)}</h3>
                <p className="rec-reason">{lang === "ja" ? r.reasonJa : r.reasonDe}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="hint center small">{t("recommendStubNote", lang)}</p>
    </div>
  );
}
