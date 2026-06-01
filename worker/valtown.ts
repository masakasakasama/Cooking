// ----------------------------------------------------------------------------
// Cooking AI — Val Town 版 HTTP ハンドラ
// ----------------------------------------------------------------------------
// Val Town (https://val.town) は GitHub ログインだけで使える無料のサーバーレス。
// CLI もメール登録も不要。ブラウザにこのコードを貼って "HTTP" val として保存すれば、
// すぐ公開URL (https://<user>-cookingai.web.val.run) が得られる。
//
// 使い方:
//  1. https://val.town に GitHub でログイン
//  2. 「New」→「HTTP val」を作成
//  3. このファイルの中身を貼り付け
//  4. 左の "Environment Variables" (鍵アイコン) で GEMINI_API_KEY を登録
//     （Google AI Studio で取得した AIza... のキー）
//  5. 保存すると公開 URL が出る。その URL をアプリの VITE_AI_WORKER_URL に設定
//
// セキュリティ: APIキーは Val Town の環境変数に置く（フロントには出さない）。
// CORS は全許可（GETできる情報を返すわけではなく、画像→レシピ変換のみ）。
// ----------------------------------------------------------------------------

const MODEL = "gemini-2.5-flash"; // 旧 1.5-flash は使わない。新しいの出たらここを変えるだけ。

const PROMPT = `あなたは料理写真からレシピを推定する専門家です。
渡された料理の画像を分析し、日本語(ja)とドイツ語(de)の両方で、以下のJSONだけを返してください。
余計な説明やマークダウンは一切付けず、JSONオブジェクトのみを出力すること。

{
  "titleJa": "料理名(日本語)",
  "titleDe": "料理名(ドイツ語)",
  "ingredients": [{"nameJa":"材料名(日)","nameDe":"材料名(独)","amount":"分量"}],
  "steps": [{"textJa":"手順(日)","textDe":"手順(独)"}],
  "timeMinutes": 推定調理時間(整数),
  "tags": ["タグ"]
}

写真から判断できない分量は一般的な目安で補ってよい。材料は5〜12個、手順は3〜8ステップ程度にまとめること。`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  // /analyze でも / でも受ける（パスは問わない）
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json({ error: "GEMINI_API_KEY env var not set in Val Town" }, 500);

  let body: { imageDataUrl?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const img = body.imageDataUrl ? parseDataUrl(body.imageDataUrl) : null;
  if (!img) return json({ error: "imageDataUrl (base64 data URL) required" }, 400);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: img.mime, data: img.base64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return json({ error: `Gemini API error ${res.status}: ${errText.slice(0, 300)}` }, 502);
  }

  const data = await res.json();
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  try {
    const recipe = JSON.parse(extractJson(raw));
    return json({ recipe });
  } catch {
    return json({ error: "AI応答の解析に失敗", raw: raw.slice(0, 500) }, 502);
  }
}
