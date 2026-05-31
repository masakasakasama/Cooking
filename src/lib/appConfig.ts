// アプリ全体の任意設定（Firebase 以外）
//
// VITE_DEFAULT_SPACE_ID を設定すると、ルート "/" を開いただけで
// その固定スペース (/space/{id}) に入る。
// → ドメイン直打ちが「固定の共有リンク」として使える。
// 例: VITE_DEFAULT_SPACE_ID=futari-kitchen
export const DEFAULT_SPACE_ID: string =
  (import.meta.env.VITE_DEFAULT_SPACE_ID ?? "").trim();

export function hasDefaultSpace(): boolean {
  return DEFAULT_SPACE_ID.length > 0;
}
