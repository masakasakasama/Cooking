import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { newSpaceId } from "../lib/id";
import { cloudModeAvailable } from "../data/createStore";
import { DEFAULT_SPACE_ID, hasDefaultSpace } from "../lib/appConfig";

const LAST_SPACE_KEY = "cooking:lastSpaceId";

// ----------------------------------------------------------------------------
// ホーム: 共有スペースの新規作成 / 直近スペースへの再入場。
// 参加は共有リンク (/space/{id}) を開くだけ。
//
// VITE_DEFAULT_SPACE_ID が設定されていれば、ルート "/" を固定スペースへ転送する
// （ドメイン直打ちが固定の共有リンクになる）。
// ----------------------------------------------------------------------------
export function HomePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const cloud = cloudModeAvailable();

  if (hasDefaultSpace()) {
    return <Navigate to={`/space/${DEFAULT_SPACE_ID}`} replace />;
  }
  const lastSpace = localStorage.getItem(LAST_SPACE_KEY);

  const create = () => {
    const id = newSpaceId();
    localStorage.setItem(LAST_SPACE_KEY, id);
    navigate(`/space/${id}`, { state: { initialName: name.trim() || "My Kitchen" } });
  };

  return (
    <div className="home">
      <div className="home-card">
        <div className="brand">
          <span className="brand-logo">🍳</span>
          <div>
            <h1>Cooking</h1>
            <p className="tagline">二人の共有レシピ &amp; 買い物リスト</p>
          </div>
        </div>

        <div className={`mode-pill ${cloud ? "cloud" : "local"}`}>
          {cloud ? "☁️ クラウド同期モード（複数デバイスで同期）" : "📴 ローカルモード（この端末のみ）"}
        </div>
        {!cloud && (
          <p className="hint">
            複数デバイスで同期するには <code>.env</code> に Firebase 設定を追加してください。
            未設定でもこの端末ではそのまま使えます。
          </p>
        )}

        <label className="field">
          <span>スペース名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: ふたりのキッチン"
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
        </label>
        <button className="btn primary block" onClick={create}>
          ＋ 共有スペースを作成
        </button>

        {lastSpace && (
          <button className="btn ghost block" onClick={() => navigate(`/space/${lastSpace}`)}>
            ↩ 前回のスペースを開く
          </button>
        )}

        <p className="hint center">
          作成後に出る<strong>共有リンク</strong>を相手に送れば、同じデータを一緒に見られます。
        </p>
      </div>
    </div>
  );
}
