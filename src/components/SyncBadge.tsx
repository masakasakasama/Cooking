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
export function SyncBadge() {
  const { syncStatus, lang } = useSpace();
  const m = META[syncStatus.state];
  return (
    <span className={`sync-badge ${syncStatus.state}`} title={syncStatus.message ?? ""}>
      <span className={`dot ${m.dot}`} />
      {t(m.key, lang)}
      {syncStatus.state === "syncing" && syncStatus.pendingWrites > 0 ? " …" : ""}
    </span>
  );
}
