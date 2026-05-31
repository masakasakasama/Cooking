// ----------------------------------------------------------------------------
// 画像圧縮ユーティリティ
// ----------------------------------------------------------------------------
// 無料枠維持のため、アップロード画像はブラウザ側でリサイズ + JPEG 圧縮し、
// 200KB 以下のサムネイル DataURL にしてから Firestore に保存する。
// 元画像の完全保存はしない（将来 Firebase Storage 対応に回す）。
// ----------------------------------------------------------------------------

const TARGET_MAX_BYTES = 200 * 1024; // 200KB
const MAX_DIMENSION = 1024; // 長辺の最大ピクセル

/** DataURL のおおよそのバイト数（base64 部分から算出） */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  // base64 は 4 文字で 3 バイト
  return Math.floor((b64.length * 3) / 4);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * File を 200KB 以下の JPEG DataURL に圧縮する。
 * 品質を段階的に落とし、それでも大きい場合は寸法も縮める。
 */
export async function compressImageToDataUrl(file: File): Promise<string> {
  const img = await loadImage(file);

  let { width, height } = img;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D コンテキストを取得できませんでした");

  const render = (w: number, h: number, quality: number): string => {
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  };

  let quality = 0.82;
  let dataUrl = render(width, height, quality);

  // まず品質を落としてターゲットに収める
  while (dataUrlBytes(dataUrl) > TARGET_MAX_BYTES && quality > 0.4) {
    quality -= 0.1;
    dataUrl = render(width, height, quality);
  }

  // それでも大きければ寸法を段階的に縮める
  while (dataUrlBytes(dataUrl) > TARGET_MAX_BYTES && width > 320) {
    width = Math.round(width * 0.85);
    height = Math.round(height * 0.85);
    dataUrl = render(width, height, quality);
  }

  return dataUrl;
}
