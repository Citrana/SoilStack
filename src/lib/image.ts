import { MEDIA_LIMITS } from "../../convex/lib/media";

/** WebP quality for uploads: a good balance for photos on slow connections. */
const WEBP_QUALITY = 0.82;
/** Width of the blur placeholder (a few hundred bytes). */
const BLUR_WIDTH = 16;

/** Scales (w, h) down so the longest side is at most `max`. Never upscales. */
export function fitWithin(width: number, height: number, max: number) {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** "Photo 12.JPG" -> "photo-12.webp" */
export function webpFilename(name: string) {
  const base =
    name
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "image";
  return `${base}.webp`;
}

export function isAcceptedImage(file: File) {
  return (MEDIA_LIMITS.mimeTypes as readonly string[]).includes(file.type);
}

export type PreparedImage = {
  blob: Blob;
  width: number;
  height: number;
  blurDataUrl: string;
  filename: string;
};

export class ImagePrepError extends Error {
  constructor(public readonly code: "INVALID_FILE" | "FILE_TOO_LARGE") {
    super(code);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new ImagePrepError("INVALID_FILE"))), type, quality),
  );
}

/**
 * Resizes an image in the browser before upload (CLAUDE.md, "Images"):
 * respects the photo's orientation, keeps the longest side at most 2000px,
 * re-encodes to WebP, and makes a tiny blur placeholder.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!isAcceptedImage(file)) throw new ImagePrepError("INVALID_FILE");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImagePrepError("INVALID_FILE");
  }
  try {
    const size = fitWithin(bitmap.width, bitmap.height, MEDIA_LIMITS.maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new ImagePrepError("INVALID_FILE");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
    // Browsers without WebP encoding fall back to PNG: still accepted.
    if (blob.size > MEDIA_LIMITS.maxBytes) throw new ImagePrepError("FILE_TOO_LARGE");

    const blur = document.createElement("canvas");
    blur.width = BLUR_WIDTH;
    blur.height = Math.max(1, Math.round((BLUR_WIDTH * size.height) / size.width));
    blur.getContext("2d")?.drawImage(bitmap, 0, 0, blur.width, blur.height);
    const blurDataUrl = blur.toDataURL("image/webp", 0.5);

    return { blob, ...size, blurDataUrl, filename: webpFilename(file.name) };
  } finally {
    bitmap.close();
  }
}

/** "1.4 MB", "820 KB" */
export function formatBytes(bytes: number, locale: string) {
  const units = ["B", "KB", "MB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(value)} ${units[unit]}`;
}
