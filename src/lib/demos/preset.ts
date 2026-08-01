import type { InterviewQuestion, ProjectBlueprint, VisualSpec } from "@/lib/schema";
import { assessScope, autoBucketFeatures } from "@/lib/scope/meter";
import { createId } from "@/lib/utils";
import { originalityWarnings } from "@/lib/visual/originality";

export const DEMO_IDEA =
  "Aplikasi pencatat utang untuk warung kecil supaya pemilik bisa tahu siapa yang belum bayar.";

export function buildDemoQuestions(idea: string): InterviewQuestion[] {
  const lower = idea.toLowerCase();
  const domainHint = lower.includes("utang")
    ? "utang warung"
    : lower.includes("habit")
      ? "habit tracker"
      : "produk baru";

  return [
    {
      id: "user",
      prompt: `Who is the primary user for this ${domainHint}?`,
      helper: "Pick one primary user. Multiple roles usually inflate MVP scope.",
      allowCustom: true,
      options: [
        { value: "Solo shop owner", label: "Solo shop owner", recommended: true },
        { value: "Small team admin", label: "Small team admin" },
        { value: "End customers", label: "End customers" },
      ],
    },
    {
      id: "job",
      prompt: "What is the single most important job to finish in the first demo?",
      helper: "If this fails, the MVP failed.",
      allowCustom: true,
      options: [
        {
          value: "Record debt and mark it paid",
          label: "Record debt and mark it paid",
          recommended: true,
        },
        { value: "Generate monthly reports", label: "Generate monthly reports" },
        { value: "Send payment reminders", label: "Send payment reminders" },
      ],
    },
    {
      id: "auth",
      prompt: "Does Phase 1 actually need authentication?",
      helper: "Demo profiles are often enough for hackathon demos.",
      allowCustom: false,
      options: [
        { value: "demo_profile", label: "No, use a demo profile", recommended: true },
        { value: "email_login", label: "Yes, email login" },
        { value: "social_login", label: "Yes, Google login" },
      ],
    },
    {
      id: "data",
      prompt: "Where should the first version store data?",
      helper: "Prefer the simplest storage that still proves the loop.",
      allowCustom: false,
      options: [
        { value: "local_demo", label: "Local / in-memory demo data", recommended: true },
        { value: "online_simple", label: "Simple online database" },
        { value: "online_multiplayer", label: "Realtime multi-user sync" },
      ],
    },
    {
      id: "constraint",
      prompt: "Which constraint should SpekDulu protect hardest?",
      helper: "This becomes the anti-scope-creep rule for Cursor.",
      allowCustom: true,
      options: [
        {
          value: "Three screens max in Phase 1",
          label: "Three screens max in Phase 1",
          recommended: true,
        },
        { value: "No payments in Phase 1", label: "No payments in Phase 1" },
        { value: "Mobile-first only", label: "Mobile-first only" },
      ],
    },
  ];
}

export function buildDemoVisual(mode: "Reference" | "Inspired" | "Distinct" = "Inspired"): VisualSpec {
  return {
    summary:
      "Calm productivity UI with white surfaces, soft blue accents, and clear card hierarchy suitable for a shop-owner tool.",
    originalityMode: mode,
    colors: [
      {
        name: "Background",
        hex: "#FFFFFF",
        role: "surface",
        source: "generated",
        confidence: 96,
        explanation: "Primary workspace background.",
      },
      {
        name: "Primary",
        hex: mode === "Distinct" ? "#0EA5E9" : "#2196F3",
        role: "accent",
        source: "inferred",
        confidence: 88,
        explanation: "Primary action and selected state accent.",
      },
      {
        name: "Text",
        hex: "#111827",
        role: "text",
        source: "generated",
        confidence: 95,
        explanation: "High-contrast body and headings.",
      },
      {
        name: "Border",
        hex: "#E5E7EB",
        role: "border",
        source: "generated",
        confidence: 93,
        explanation: "Subtle separators and card outlines.",
      },
    ],
    typography: [
      {
        family: "Plus Jakarta Sans",
        category: "heading",
        notes: "Bold headings with comfortable spacing.",
        confidence: 90,
      },
      {
        family: "Plus Jakarta Sans",
        category: "body",
        notes: "Readable UI body text.",
        confidence: 90,
      },
    ],
    spacingScale: ["4", "8", "12", "16", "24", "32", "48"],
    radii: { button: "12px", card: "18px", modal: "20px" },
    components: ["TopNav", "DebtCard", "CustomerList", "StatusChip", "QuickAddForm"],
    sections: ["Header summary", "Customer debts", "Quick add", "Payment status"],
    warnings: originalityWarnings(mode),
  };
}

export function buildDemoBlueprint(
  idea: string,
  answers: Record<string, string>,
): ProjectBlueprint {
  const productName =
    answers.productName ||
    (idea.toLowerCase().includes("utang") ? "WarungNota" : "SpekStarter");
  const mustHaveAuth = answers.auth === "email_login" || answers.auth === "social_login";
  const dataMode =
    answers.data === "online_simple" || answers.data === "online_multiplayer"
      ? answers.data
      : "local_demo";

  const features = autoBucketFeatures([
    {
      name: "Customer debt list",
      description: "See who owes money and how much.",
      complexity: "low",
    },
    {
      name: "Add debt entry",
      description: "Create a debt record with amount and note.",
      complexity: "low",
    },
    {
      name: "Mark as paid",
      description: "Update payment status quickly.",
      complexity: "low",
    },
    {
      name: "Search customers",
      description: "Find a customer by name.",
      complexity: "medium",
    },
    {
      name: "Payment reminders",
      description: "Send WhatsApp or SMS reminders.",
      complexity: "high",
    },
    {
      name: "Admin analytics dashboard",
      description: "Charts for monthly debt trends.",
      complexity: "high",
    },
    {
      name: "Subscription billing",
      description: "Charge shop owners monthly.",
      complexity: "high",
    },
  ]);

  const screens = [
    {
      id: "screen_home",
      name: "Debt Overview",
      purpose: "Show open debts and quick totals.",
      priority: "p0" as const,
      components: ["SummaryHeader", "DebtCard", "QuickAddButton"],
    },
    {
      id: "screen_customer",
      name: "Customer Detail",
      purpose: "Inspect one customer history and mark paid.",
      priority: "p0" as const,
      components: ["CustomerHeader", "DebtTimeline", "MarkPaidButton"],
    },
    {
      id: "screen_add",
      name: "Add Debt",
      purpose: "Create a new debt entry.",
      priority: "p0" as const,
      components: ["QuickAddForm", "AmountInput", "NoteField"],
    },
  ];

  const entities = [
    {
      name: "Customer",
      fields: ["id", "name", "phone?", "notes?"],
      notes: "Keep phone optional in Phase 1.",
    },
    {
      name: "DebtEntry",
      fields: ["id", "customerId", "amount", "note", "status", "createdAt", "paidAt?"],
    },
  ];

  const acceptanceCriteria = [
    {
      id: "ac_1",
      phase: "Phase 1",
      text: "User can create a customer debt entry with amount and note.",
    },
    {
      id: "ac_2",
      phase: "Phase 1",
      text: "User can mark a debt as paid and see status update immediately.",
    },
    {
      id: "ac_3",
      phase: "Phase 1",
      text: "Overview shows open total and list of unpaid debts.",
    },
  ];

  const scope = assessScope(features, {
    mustHaveAuth,
    dataMode,
    screenCount: screens.length,
  });

  const now = new Date().toISOString();
  return {
    id: createId("project"),
    createdAt: now,
    updatedAt: now,
    rawIdea: idea,
    answers,
    decisions: {
      productName,
      oneLiner: "Help small shop owners track who still owes them money.",
      targetUser: answers.user || "Solo shop owner",
      coreProblem: answers.job || "Record debt and mark it paid",
      primaryJourney: "Open app -> add debt -> review list -> mark paid",
      mustHaveAuth,
      dataMode: dataMode as "local_demo" | "online_simple" | "online_multiplayer",
      recommendedStack: ["Next.js", "TypeScript", "Tailwind CSS", "Local state / IndexedDB"],
      risks: [
        "Scope creep into reminders and analytics",
        "Unclear payment status language",
        "Building auth before the core loop works",
      ],
    },
    features,
    screens,
    entities,
    acceptanceCriteria,
    scope,
    visual: buildDemoVisual("Inspired"),
    documents: [],
    artifacts: [],
    chat: [],
    versions: [],
    provider: "demo",
    hasScreenshot: false,
  };
}
