import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSpace } from "../store/SpaceContext";
import { t } from "../i18n";

// 共有リンクのコピー & スペース切替
export function ShareBar() {
  const { lang } = useSpace();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const url = window.location.href.split("?")[0];

  const copy = async () => {
    try {
      if (navigator.share) {
        // モバイルではネイティブ共有シートを優先（iPhone Safari 等）
        await navigator.share({ title: "Cooking", url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // フォールバック: 手動コピー用に選択
      window.prompt(t("copyLink", lang), url);
    }
  };

  return (
    <div className="share-bar">
      <button className="btn small primary" onClick={copy}>
        🔗 {copied ? t("linkCopied", lang) : t("copyLink", lang)}
      </button>
      <button className="btn small ghost" onClick={() => navigate("/")}>
        {t("leaveSpace", lang)}
      </button>
      <span className="share-hint">{t("joinHint", lang)}</span>
    </div>
  );
}
