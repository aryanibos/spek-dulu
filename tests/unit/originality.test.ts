import { describe, expect, it } from "vitest";
import { applyOriginalityTransformation } from "@/lib/visual/originality";

describe("originality transforms", () => {
  it("keeps reference colors unchanged", () => {
    expect(applyOriginalityTransformation("#2196F3", "Reference")).toBe("#2196F3");
  });

  it("shifts inspired and distinct colors", () => {
    const inspired = applyOriginalityTransformation("#2196F3", "Inspired");
    const distinct = applyOriginalityTransformation("#2196F3", "Distinct");
    expect(inspired).not.toBe("#2196F3");
    expect(distinct).not.toBe("#2196F3");
    expect(inspired).not.toBe(distinct);
  });
});
