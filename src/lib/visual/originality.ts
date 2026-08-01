import type { OriginalityMode } from "@/lib/schema";

function hexToHsl(hex: string): [number, number, number] {
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const num = Number.parseInt(full, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  return [(h / 6) * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function applyOriginalityTransformation(
  hex: string,
  mode: OriginalityMode,
): string {
  if (mode === "Reference") return hex.toUpperCase();
  const [h, s, l] = hexToHsl(hex);
  if (mode === "Inspired") return hslToHex((h + 18) % 360, s, l);
  return hslToHex((h + 42) % 360, Math.min(100, s + 4), l);
}

export function originalityWarnings(mode: OriginalityMode): string[] {
  const shared = [
    "Do not copy logos, trademarks, proprietary icons, or brand copy.",
    "Hue shifts are visual adaptation aids, not legal clearance.",
  ];
  if (mode === "Reference") {
    return [
      ...shared,
      "Reference mode preserves visual principles for learning, not brand replication.",
    ];
  }
  if (mode === "Inspired") {
    return [...shared, "Inspired mode shifts accents while keeping layout rhythm."];
  }
  return [...shared, "Distinct mode increases divergence for a clearer original identity."];
}
