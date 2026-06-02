// ----------------------------------------------------------------------------
// 自動更新（毎回アンインストール不要にする仕組み）
// ----------------------------------------------------------------------------
// 問題: iOS のホーム画面アプリやブラウザは index.html を強くキャッシュするため、
//       新しくデプロイしても古い画面のまま固まる（=作り直し/再インストールが必要）。
//
// 解決: 起動時・前面復帰時に version.json を no-store で取得し、ビルドに焼き込んだ
//       自分のバージョン(__APP_VERSION__)と違えば「新版あり」と判断。古いキャッシュと
//       Service Worker を消し、URL に ?v=新版 を付けて location.replace する。
//       URL が変わることで端末は必ず最新の index.html を取り直す（キャッシュ回避）。
//
// 汎用: 依存ライブラリ無し。BASE_URL を見るのでどのホスト/サブパスでも動く。
// 注意: この仕組みが「載った版」以降の更新が自動になる。これを載せる最初の1回だけは
//       手動リロード/再インストールが要る（古い版にはこのコードが無いため）。
// ----------------------------------------------------------------------------

const CURRENT_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

const VERSION_URL = `${import.meta.env.BASE_URL}version.json`;
const RELOAD_GUARD_KEY = "appUpdate:reloadedFor";
const MIN_INTERVAL_MS = 30_000; // 連打防止

let checking = false;
let lastCheck = 0;

/** 新版があれば自動でキャッシュを捨てて最新版にリロードする。 */
export async function checkForUpdate(force = false): Promise<void> {
  if (checking) return;
  const now = Date.now();
  if (!force && now - lastCheck < MIN_INTERVAL_MS) return;
  lastCheck = now;
  checking = true;
  try {
    const res = await fetch(`${VERSION_URL}?t=${now}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { version?: string };
    const remote = String(data.version ?? "");
    if (!remote || remote === CURRENT_VERSION) return;

    // 同じ新版で既にこのセッションでリロード済みなら、ループ防止のため止める
    // （配信反映待ちなどで古い index.html が返り続けるケースの保険）。
    if (safeSession("get", RELOAD_GUARD_KEY) === remote) return;

    await applyUpdate(remote);
  } catch {
    /* オフライン等は無視。次回起動/復帰で再チェック */
  } finally {
    checking = false;
  }
}

async function applyUpdate(remote: string): Promise<void> {
  // Service Worker とキャッシュを全消去（将来 SW を入れても確実に新版へ移行できる）
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* noop */
  }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* noop */
  }

  safeSession("set", RELOAD_GUARD_KEY, remote);
  showUpdatingBanner();

  // URL を変える(?v=)ことで、端末に最新 index.html を強制取得させる
  const url = new URL(window.location.href);
  url.searchParams.set("v", remote);
  // 少し待ってからリロード（バナーを見せる + SW 解除の反映猶予）
  window.setTimeout(() => window.location.replace(url.toString()), 600);
}

// React 起動前でも出せる軽量バナー（DOM 直挿し）
function showUpdatingBanner(): void {
  if (document.getElementById("app-update-banner")) return;
  const el = document.createElement("div");
  el.id = "app-update-banner";
  el.textContent = "🔄 最新バージョンに更新中… / Aktualisiere…";
  el.setAttribute(
    "style",
    [
      "position:fixed",
      "left:50%",
      "top:calc(env(safe-area-inset-top,0px) + 12px)",
      "transform:translateX(-50%)",
      "z-index:9999",
      "background:#2c2622",
      "color:#fff",
      "padding:9px 18px",
      "border-radius:999px",
      "font-size:13px",
      "font-weight:600",
      "box-shadow:0 2px 12px rgba(0,0,0,.25)",
      "font-family:system-ui,-apple-system,sans-serif",
    ].join(";"),
  );
  document.body.appendChild(el);
}

// sessionStorage はプライベートモード等で例外を投げうるので握りつぶす
function safeSession(op: "get" | "set", key: string, val?: string): string | null {
  try {
    if (op === "set") {
      sessionStorage.setItem(key, val ?? "");
      return val ?? "";
    }
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 起動時に呼ぶ。以後、前面復帰・オンライン復帰でも自動チェックする。 */
export function startAutoUpdate(): void {
  void checkForUpdate(true);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkForUpdate();
  });
  window.addEventListener("focus", () => void checkForUpdate());
  window.addEventListener("online", () => void checkForUpdate());
}
