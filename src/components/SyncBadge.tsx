import { useState } from "react";
import { useSpace } from "../store/SpaceContext";
import { t } from "../i18n";
import type { SyncState } from "../types";

const META: Record<SyncState, { key: Parameters<typeof t>[0]; dot: string }> = {
  local: { key: "syncLocal", dot: "dot-local" },
  connecting: { key: "syncConnecting", dot: "dot-connecting" },
  syncing: { key: "syncSyncing", dot: "dot-syncing" },
  synced: { key: "syncSynced", dot: "dot-synced" },
  offline: { key: "syncOffline", dot: "dot-offline" },
  error: { key: "syncError", dot: "dot-error" },
};

// 同期状態の小バッジ: ローカル / 接続中 / 同期中 / 同期済み / オフライン / エラー
// エラー時はタップで詳細（原因メッセージ＋コード）を展開し、原因の切り分けを可能にする。
export function SyncBadge() {
  const { syncStatus, lang } = useSpace();
  const [open, setOpen] = useState(false);
  const m = META[syncStatus.state];
  const hasDetail = syncStatus.state === "error" && Boolean(syncStatus.message);

  return (
    <span className="sync-badge-wrap">
      <button
        type="button"
        className={`sync-badge ${syncStatus.state}`}
        title={syncStatus.message ?? ""}
        onClick={() => hasDetail && setOpen((v) => !v)}
        style={{ cursor: hasDetail ? "pointer" : "default" }}
      >
        <span className={`dot ${m.dot}`} />
        {t(m.key, lang)}
        {syncStatus.state === "syncing" && syncStatus.pendingWrites > 0 ? " …" : ""}
        {hasDetail ? " ⓘ" : ""}
      </button>
      {open && hasDetail && (
        <span className="sync-detail" role="alert">
          {syncStatus.message}
          {syncStatus.errorCode ? ` [${syncStatus.errorCode}]` : ""}
        </span>
      )}
    </span>
  );
}
