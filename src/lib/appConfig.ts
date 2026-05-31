// アプリ全体の設定（Firebase 以外）
//
// このアプリは「常に1つの固定スペースで同期する」方針。
// 複数スペースの作成・参加・切り替えは行わない。
// ドメインを開けば誰でも同じ FIXED_SPACE_ID のデータを見る。
//
// 既定はコードに直接埋め込む（env 設定漏れでも必ず動くように）。
// 必要なら VITE_DEFAULT_SPACE_ID で上書き可能。
const ENV_SPACE_ID = (import.meta.env.VITE_DEFAULT_SPACE_ID ?? "").trim();

export const FIXED_SPACE_ID: string = ENV_SPACE_ID || "futari-kitchen";
