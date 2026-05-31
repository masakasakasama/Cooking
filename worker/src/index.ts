// ----------------------------------------------------------------------------
// Cooking AI Worker (Cloudflare Workers)
// ----------------------------------------------------------------------------
// 料理写真を受け取り、AI(画像解析)でレシピ(タイトル/材料/手順)を抽出して返す。
//
// 設計方針:
// - APIキーはこの Worker の環境変数に置く（フロントには絶対に置かない）
// - フロント(GitHub Pages)から呼べるよう CORS を許可
// - 既定モデルは最新の高性能ビジョンモデル。MODEL 変数で差し替え可能
//   （gemini-1.5-flash のような旧モデルは使わない）
//
// 対応プロバイダ（環境変数 AI_PROVIDER で選択。既定 "gemini"）:
//   - "gemini": Google Gemini。GEMINI_API_KEY 必須。既定 MODEL=gemini-2.5-flash
//   - "openai": OpenAI互換。OPENAI_API_KEY と OPENAI_BASE_URL 必須
//
// デプロイ:
//   cd worker && npm i && npx wrangler deploy
//   npx wrangler secret put GEMINI_API_KEY
// ----------------------------------------------------------------------------

export interface Env {
  AI_PROVIDER?: string;
  MODEL?: string;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  // CORS 許可オリジン（カンマ区切り）。未設定なら全許可。
  ALLOWED_ORIGINS?: string;
}

interface AnalyzeRequest {
  imageDataUrl: string; // data:image/jpeg;base64,....
  lang?: "ja" | "de";
}

interface ExtractedRecipe {
  titleJa: string;
  titleDe: string;
  ingredients: { nameJa: string; nameDe: string; amount: string }[];
  steps: { textJa: string; textDe: string }[];
  timeMinutes: number;
  tags: string[];
}

function corsHeaders(env: Env, origin: string | null): Record<string, string> {
  const allow = env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim());
  const allowOrigin =
    !allow || allow.length === 0
      ? "*"
      : origin && allow.includes(origin)
        ? origin
        : allow[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

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

// data URL から mime と base64 を取り出す
function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

// JSON 本文を頑健に取り出す（```json フェンス等を除去）
function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

async function callGemini(env: Env, img: { mime: string; base64: string }): Promise<string> {
  const model = env.MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: img.mime, data: img.base64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenAI(env: Env, img: { mime: string; base64: string }): Promise<string> {
  const model = env.MODEL || "gpt-4o-mini";
  const base = env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: `data:${img.mime};base64,${img.base64}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(env, origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return json({ error: "POST only" }, 405, cors);
    }

    let payload: AnalyzeRequest;
    try {
      payload = (await request.json()) as AnalyzeRequest;
    } catch {
      return json({ error: "invalid JSON body" }, 400, cors);
    }

    const img = payload.imageDataUrl ? parseDataUrl(payload.imageDataUrl) : null;
    if (!img) {
      return json({ error: "imageDataUrl (base64 data URL) required" }, 400, cors);
    }

    const provider = (env.AI_PROVIDER || "gemini").toLowerCase();
    try {
      let raw: string;
      if (provider === "openai") {
        if (!env.OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY not set" }, 500, cors);
        raw = await callOpenAI(env, img);
      } else {
        if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY not set" }, 500, cors);
        raw = await callGemini(env, img);
      }

      let recipe: ExtractedRecipe;
      try {
        recipe = JSON.parse(extractJson(raw)) as ExtractedRecipe;
      } catch {
        return json({ error: "AI応答の解析に失敗", raw: raw.slice(0, 500) }, 502, cors);
      }
      return json({ recipe }, 200, cors);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 502, cors);
    }
  },
};
