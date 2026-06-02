import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// ビルドごとに一意なバージョン（更新検知に使う）。
// CI で APP_VERSION（コミットSHA等）を渡せばそれを使う。無ければビルド時刻。
const APP_VERSION = process.env.APP_VERSION || String(Date.now());

// version.json を「ビルド出力に書き出す」＋「dev サーバで配る」プラグイン。
// 起動中アプリがこれを no-store で取得し、自分のバージョンと違えば自動更新する。
function appVersionPlugin(version: string): Plugin {
  const body = JSON.stringify({ version });
  return {
    name: "app-version",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.replace(/\?.*$/, "").endsWith("/version.json")) {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(body);
          return;
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: body });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  // 公開先のサブパス。GitHub Pages のプロジェクトサイトは /<repo>/ 配下になるため
  // 既定を "/Cooking/" にする。別ホスト（Firebase Hosting 等）では "/" を渡す。
  //   例: VITE_BASE_PATH=/ npm run build
  base: process.env.VITE_BASE_PATH ?? "/Cooking/",
  plugins: [react(), appVersionPlugin(APP_VERSION)],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  server: {
    host: true,
  },
  build: {
    // Firebase SDK 単体で ~500KB あるため、警告閾値を現実的な値に調整
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Firebase は重いので別チャンクに分け、初回ロードと再訪キャッシュを最適化
        manualChunks: {
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
