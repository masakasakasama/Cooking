import { useState } from "react";
import { SpaceProvider, useSpace } from "../store/SpaceContext";
import { t } from "../i18n";
import { SyncBadge } from "../components/SyncBadge";
import { LangToggle } from "../components/LangToggle";
import { ShareBar } from "../components/ShareBar";
import { RecipesView } from "../components/RecipesView";
import { ShoppingView } from "../components/ShoppingView";
import { PreferencesView } from "../components/PreferencesView";
import { RecommendView } from "../components/RecommendView";
import { DiscoverView } from "../components/DiscoverView";
import { FIXED_SPACE_ID } from "../lib/appConfig";

type Tab = "recipes" | "discover" | "shopping" | "recommend" | "preferences";

export function SpacePage() {
  // 常に1つの固定スペースで同期する。URL に関係なく同じスペースを開く。
  return (
    <SpaceProvider spaceId={FIXED_SPACE_ID} initialName="My Kitchen">
      <SpaceShell />
    </SpaceProvider>
  );
}

function SpaceShell() {
  const { lang, meta, ready } = useSpace();
  const [tab, setTab] = useState<Tab>("recipes");

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-row">
          <div className="header-title">
            <span className="brand-logo small">🍳</span>
            <div className="title-text">
              <strong>{meta?.name || t("appName", lang)}</strong>
              <SyncBadge />
            </div>
          </div>
          <LangToggle />
        </div>
        <ShareBar />
      </header>

      <main className="app-main">
        {!ready ? (
          <div className="loading">読み込み中… / Lädt…</div>
        ) : (
          <>
            {tab === "recipes" && <RecipesView />}
            {tab === "discover" && <DiscoverView />}
            {tab === "shopping" && <ShoppingView />}
            {tab === "recommend" && <RecommendView />}
            {tab === "preferences" && <PreferencesView />}
          </>
        )}
      </main>

      <nav className="tabbar">
        <TabButton active={tab === "recipes"} onClick={() => setTab("recipes")} icon="📖" label={t("navRecipes", lang)} />
        <TabButton active={tab === "discover"} onClick={() => setTab("discover")} icon="🔍" label={t("navDiscover", lang)} />
        <TabButton active={tab === "shopping"} onClick={() => setTab("shopping")} icon="🛒" label={t("navShopping", lang)} />
        <TabButton active={tab === "recommend"} onClick={() => setTab("recommend")} icon="✨" label={t("navRecommend", lang)} />
        <TabButton active={tab === "preferences"} onClick={() => setTab("preferences")} icon="⚙️" label={t("navPreferences", lang)} />
      </nav>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button className={`tab ${active ? "active" : ""}`} onClick={onClick}>
      <span className="tab-icon">{icon}</span>
      <span className="tab-label">{label}</span>
    </button>
  );
}
