import { describe, expect, it } from "vitest";
import { buildDemoBlueprint } from "@/lib/demos/preset";
import {
  listDesignSuggestions,
  reviseVisualSpec,
  suggestVisualForApp,
} from "@/lib/visual/suggest";

describe("visual design suggestions", () => {
  const blueprint = buildDemoBlueprint("Aplikasi pencatat utang warung", {
    user: "Solo shop owner",
    job: "Record debt and mark it paid",
    auth: "demo_profile",
    data: "local_demo",
    constraint: "Three screens max in Phase 1",
  });

  it("recommends a trust-blue direction for debt/owner apps", () => {
    const suggestions = listDesignSuggestions(blueprint);
    expect(suggestions.some((s) => s.recommended && s.id === "trust-blue")).toBe(true);
    const visual = suggestVisualForApp(blueprint, "Inspired");
    expect(visual.colors.some((c) => c.role === "accent")).toBe(true);
    expect(visual.summary).toContain("WarungNota");
  });

  it("revises palette from natural language instructions", () => {
    const base = suggestVisualForApp(blueprint, "Inspired");
    const green = reviseVisualSpec(base, blueprint, "buat lebih hijau dan fresh", "Inspired");
    expect(green.colors.find((c) => c.name === "Primary")?.hex.toLowerCase()).toBe("#059669");

    const soft = reviseVisualSpec(base, blueprint, "lebih rounded dan lembut", "Inspired");
    expect(soft.radii.button).toBe("999px");
  });
});
