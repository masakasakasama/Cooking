import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { SpacePage } from "./pages/SpacePage";
import "./index.css";

// Vite の base（例: "/Cooking/"）にルーターを合わせる。
// これでサブパス公開でもクリーンURLのルーティングが成立する。
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

const router = createBrowserRouter(
  [
    { path: "/", element: <HomePage /> },
    { path: "/space/:spaceId", element: <SpacePage /> },
    { path: "*", element: <Navigate to="/" replace /> },
  ],
  { basename },
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
