// ランダム ID 生成。crypto.randomUUID が無い古い WebView 向けにフォールバック。
export function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* noop */
  }
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}

// 共有スペース ID は短く URL に優しい形にする（人が送りやすい）。
export function newSpaceId(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"; // 紛らわしい文字を除外
  let out = "";
  const bytes = new Uint8Array(12);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}
