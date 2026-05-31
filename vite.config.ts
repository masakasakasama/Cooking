import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
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
