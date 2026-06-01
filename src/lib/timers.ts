// ----------------------------------------------------------------------------
// 手順テキストから時間（「10分」「5〜6分」「1時間」「10 Min.」）を抽出して、
// タップで起動できるタイマーのチップに変換する。
// ----------------------------------------------------------------------------

export interface ParsedTimer {
  label: string; // 表示用（例: "10分"）
  seconds: number;
}

const PATTERNS: { re: RegExp; unit: number }[] = [
  // 日本語
  { re: /(\d+(?:\.\d+)?)\s*時間/g, unit: 3600 },
  { re: /(\d+(?:\.\d+)?)\s*分/g, unit: 60 },
  { re: /(\d+(?:\.\d+)?)\s*秒/g, unit: 1 },
  // ドイツ語/英語
  { re: /(\d+(?:\.\d+)?)\s*(?:std|stunde[n]?|h)\b/gi, unit: 3600 },
  { re: /(\d+(?:\.\d+)?)\s*(?:min(?:ute[n]?)?|m)\b/gi, unit: 60 },
  { re: /(\d+(?:\.\d+)?)\s*(?:sek(?:unde[n]?)?|s)\b/gi, unit: 1 },
];

/** テキスト内のすべての時間表現を抽出（重複ラベルは1つにまとめる）。 */
export function parseTimers(text: string): ParsedTimer[] {
  const found = new Map<string, ParsedTimer>();
  for (const { re, unit } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const value = Number(m[1]);
      if (!value || value <= 0) continue;
      const label = m[0].trim();
      const seconds = Math.round(value * unit);
      if (!found.has(label)) found.set(label, { label, seconds });
    }
  }
  return [...found.values()];
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
