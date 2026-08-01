import type { OriginalityMode, ProjectBlueprint, VisualSpec } from "@/lib/schema";
import { originalityWarnings } from "@/lib/visual/originality";

type DesignPreset = {
  id: string;
  label: string;
  summary: string;
  accent: string;
  soft: string;
  background: string;
  text: string;
  border: string;
  headingFont: string;
  bodyFont: string;
  match: RegExp;
};

const PRESETS: DesignPreset[] = [
  {
    id: "trust-blue",
    label: "Trust Blue Workspace",
    summary:
      "Calm productivity workspace with white surfaces and a trustworthy blue accent. Ideal for ops, finance, and owner tools.",
    accent: "#2196F3",
    soft: "#E3F2FD",
    background: "#FFFFFF",
    text: "#111827",
    border: "#E5E7EB",
    headingFont: "Plus Jakarta Sans",
    bodyFont: "Plus Jakarta Sans",
    match: /utang|debt|finance|invoice|warung|shop|owner|ledger|nota|billing|saas|dashboard/i,
  },
  {
    id: "fresh-green",
    label: "Fresh Growth Green",
    summary:
      "Fresh light UI with emerald accent for health, habits, education, and growth products.",
    accent: "#059669",
    soft: "#ECFDF5",
    background: "#FFFFFF",
    text: "#111827",
    border: "#E5E7EB",
    headingFont: "Plus Jakarta Sans",
    bodyFont: "Plus Jakarta Sans",
    match: /habit|health|fitness|learn|course|green|grow|garden|eco|wellness/i,
  },
  {
    id: "warm-coral",
    label: "Warm Coral Maker",
    summary:
      "Warm off-white surfaces with coral accent for creator, community, and lifestyle products.",
    accent: "#E11D48",
    soft: "#FFF1F2",
    background: "#FFFCFB",
    text: "#1F2937",
    border: "#F3E8E8",
    headingFont: "Plus Jakarta Sans",
    bodyFont: "Plus Jakarta Sans",
    match: /creator|community|social|portfolio|cafe|food|lifestyle|event|booking/i,
  },
  {
    id: "slate-pro",
    label: "Slate Professional",
    summary:
      "Neutral slate system with sharp hierarchy for B2B tools, CRM, and internal workspaces.",
    accent: "#2563EB",
    soft: "#EFF6FF",
    background: "#FFFFFF",
    text: "#0F172A",
    border: "#E2E8F0",
    headingFont: "Plus Jakarta Sans",
    bodyFont: "Plus Jakarta Sans",
    match: /crm|b2b|agency|internal|admin|inventory|hr|project|task|manage/i,
  },
];

function pickPreset(bp: ProjectBlueprint): DesignPreset {
  const haystack = [
    bp.rawIdea,
    bp.decisions.productName,
    bp.decisions.oneLiner,
    bp.decisions.targetUser,
    bp.decisions.coreProblem,
    ...bp.features.map((f) => `${f.name} ${f.description}`),
  ].join(" ");

  return PRESETS.find((preset) => preset.match.test(haystack)) ?? PRESETS[0];
}

function toVisual(
  bp: ProjectBlueprint,
  preset: DesignPreset,
  mode: OriginalityMode,
  extraSummary?: string,
): VisualSpec {
  const accent =
    mode === "Distinct"
      ? preset.id === "trust-blue"
        ? "#0EA5E9"
        : preset.id === "fresh-green"
          ? "#10B981"
          : preset.id === "warm-coral"
            ? "#F43F5E"
            : "#3B82F6"
      : preset.accent;

  return {
    summary: extraSummary
      ? `${preset.summary} ${extraSummary}`
      : `${preset.summary} Tuned for ${mode} originality.`,
    originalityMode: mode,
    colors: [
      {
        name: "Background",
        hex: preset.background,
        role: "surface",
        source: "generated",
        confidence: 94,
        explanation: "Main application background.",
      },
      {
        name: "Primary",
        hex: accent,
        role: "accent",
        source: "generated",
        confidence: 92,
        explanation: "Primary CTA and selected-state accent.",
      },
      {
        name: "Soft Accent",
        hex: preset.soft,
        role: "surface",
        source: "generated",
        confidence: 90,
        explanation: "Soft selected chips and section accents.",
      },
      {
        name: "Text",
        hex: preset.text,
        role: "text",
        source: "generated",
        confidence: 96,
        explanation: "Primary readable text color.",
      },
      {
        name: "Border",
        hex: preset.border,
        role: "border",
        source: "generated",
        confidence: 93,
        explanation: "Card and divider borders.",
      },
    ],
    typography: [
      {
        family: preset.headingFont,
        category: "heading",
        notes: "Bold product headings with tight tracking.",
        confidence: 91,
      },
      {
        family: preset.bodyFont,
        category: "body",
        notes: "Comfortable UI body text.",
        confidence: 91,
      },
    ],
    spacingScale: ["4", "8", "12", "16", "24", "32", "48"],
    radii: { button: "12px", card: "18px", modal: "20px" },
    components: [
      ...new Set(
        bp.screens.flatMap((s) => s.components).concat(["TopNav", "StatusChip", "PrimaryButton"]),
      ),
    ],
    sections: bp.screens.map((s) => s.name),
    warnings: [
      ...originalityWarnings(mode),
      `Suggested palette: ${preset.label}. Replace freely if brand direction changes.`,
    ],
  };
}

export function listDesignSuggestions(bp: ProjectBlueprint) {
  const best = pickPreset(bp);
  return PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    summary: preset.summary,
    accent: preset.accent,
    recommended: preset.id === best.id,
  }));
}

export function suggestVisualForApp(
  bp: ProjectBlueprint,
  mode: OriginalityMode = "Inspired",
  presetId?: string,
): VisualSpec {
  const preset =
    PRESETS.find((item) => item.id === presetId) ??
    pickPreset(bp);
  return toVisual(
    bp,
    preset,
    mode,
    `Matched to ${bp.decisions.productName} for ${bp.decisions.targetUser}.`,
  );
}

export function reviseVisualSpec(
  current: VisualSpec | undefined,
  bp: ProjectBlueprint,
  instruction: string,
  mode: OriginalityMode = current?.originalityMode ?? "Inspired",
): VisualSpec {
  const base = current ?? suggestVisualForApp(bp, mode);
  const lower = instruction.toLowerCase();

  let next = { ...base, colors: base.colors.map((c) => ({ ...c })) };

  if (/hijau|green|emerald/.test(lower)) {
    next = suggestVisualForApp(bp, mode, "fresh-green");
  } else if (/coral|merah|rose|pink|warm/.test(lower)) {
    next = suggestVisualForApp(bp, mode, "warm-coral");
  } else if (/slate|profesional|b2b|netral/.test(lower)) {
    next = suggestVisualForApp(bp, mode, "slate-pro");
  } else if (/biru|blue|trust/.test(lower)) {
    next = suggestVisualForApp(bp, mode, "trust-blue");
  } else if (/gelap|dark/.test(lower)) {
    next.colors = next.colors.map((color) => {
      if (color.name === "Background") return { ...color, hex: "#0F172A", explanation: "Dark workspace background from revision request." };
      if (color.name === "Text") return { ...color, hex: "#F8FAFC", explanation: "Light text for dark surfaces." };
      if (color.name === "Border") return { ...color, hex: "#334155", explanation: "Muted dark border." };
      return color;
    });
    next.summary = `${next.summary} Revised toward a darker workspace based on: "${instruction}".`;
  } else if (/rounded|pill|lembut/.test(lower)) {
    next.radii = { button: "999px", card: "24px", modal: "28px" };
    next.summary = `${next.summary} Increased roundness based on revision request.`;
  } else if (/sharp|tajam|kotak/.test(lower)) {
    next.radii = { button: "8px", card: "12px", modal: "14px" };
    next.summary = `${next.summary} Reduced roundness for a sharper product feel.`;
  } else {
    next.summary = `${base.summary} Revised with instruction: "${instruction}".`;
    next.warnings = [
      ...base.warnings,
      "Manual revision applied. Review tokens before exporting to Cursor.",
    ];
  }

  next.originalityMode = mode;
  next.sections = bp.screens.map((s) => s.name);
  next.components = [
    ...new Set(bp.screens.flatMap((s) => s.components).concat(next.components)),
  ];
  return next;
}
