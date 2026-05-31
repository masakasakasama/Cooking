import { useSpace } from "../store/SpaceContext";

// 日本語 / ドイツ語 切替トグル（displaySettings に保存され、同期される）
export function LangToggle() {
  const { lang, setLang } = useSpace();
  return (
    <div className="lang-toggle" role="group" aria-label="language">
      <button className={lang === "ja" ? "active" : ""} onClick={() => setLang("ja")}>
        🇯🇵 JA
      </button>
      <button className={lang === "de" ? "active" : ""} onClick={() => setLang("de")}>
        🇩🇪 DE
      </button>
    </div>
  );
}
