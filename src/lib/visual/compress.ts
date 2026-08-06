export async function compressImageFile(
  file: File,
  maxDimension = 1600,
  quality = 0.82,
): Promise<{ dataUrl: string; mimeType: string; width: number; height: number }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image uploads are supported.");
  }
  if (file.size > 12_000_000) {
    throw new Error("Image is too large. Please use a file under 12MB.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const dataUrl = canvas.toDataURL(mimeType, quality);
  const base64Length = dataUrl.replace(/^data:[^;]+;base64,/, "").length;
  if (base64Length > 4_000_000) {
    throw new Error(
      "Image is still too large after compression. Use a smaller or simpler image.",
    );
  }
  return { dataUrl, mimeType, width, height };
}

export function dataUrlToBase64(dataUrl: string) {
  return dataUrl.replace(/^data:[^;]+;base64,/, "");
}
