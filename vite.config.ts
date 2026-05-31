import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // 公開先のサブパス。GitHub Pages のプロジェクトサイトは /<repo>/ 配下になるため
  // 既定を "/Cooking/" にする。別ホスト（Firebase Hosting 等）では "/" を渡す。
  //   例: VITE_BASE_PATH=/ npm run build
  base: process.env.VITE_BASE_PATH ?? "/Cooking/",
  plugins: [react()],
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
