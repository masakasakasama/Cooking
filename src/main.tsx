import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SpacePage } from "./pages/SpacePage";
import { startAutoUpdate } from "./lib/appUpdate";
import "./index.css";

const base = import.meta.env.BASE_URL; // 例: "/Cooking/"
const basename = base.replace(/\/$/, "") || undefined;

// PWA マニフェストとアイコンを、サブパス(base)込みの正しいURLで動的に挿入する。
// （index.html に直書きすると GitHub Pages のサブパスで解決を誤るため）
(function injectPwaLinks() {
  const head = document.head;
  const manifest = document.createElement("link");
  manifest.rel = "manifest";
  manifest.href = `${base}manifest.webmanifest`;
  head.appendChild(manifest);

  const icon = document.createElement("link");
  icon.rel = "apple-touch-icon";
  icon.href = `${base}icon.svg`;
  head.appendChild(icon);
})();

// 起動したら最新版を確認し、新版があれば自動で最新へ更新（毎回アンインストール不要）
startAutoUpdate();

// 常に1つの固定スペースで同期する方針。どのパスを開いても同じスペースを表示する。
const router = createBrowserRouter(
  [{ path: "*", element: <SpacePage /> }],
  { basename },
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
