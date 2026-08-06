import { z } from "zod";

export const MAX_DOC_CONTENT = 120_000;
export const ALLOWED_SCREENSHOT_MIME = /^image\/(png|jpe?g|webp)$/i;

export const boundedRecordSchema = z
  .record(z.string().max(100), z.string().max(2000))
  .refine((obj) => Object.keys(obj).length <= 20, "Too many entries.");

export function requirePairedScreenshotFields(
  data: { screenshotBase64?: string; screenshotMimeType?: string },
  ctx: z.RefinementCtx,
) {
  const hasBase64 = Boolean(data.screenshotBase64);
  const hasMime = Boolean(data.screenshotMimeType);
  if (hasBase64 !== hasMime) {
    ctx.addIssue({
      code: "custom",
      message: "screenshotBase64 and screenshotMimeType must be provided together.",
    });
  }
}
