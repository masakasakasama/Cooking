import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SpacePage } from "./pages/SpacePage";
import "./index.css";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

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
