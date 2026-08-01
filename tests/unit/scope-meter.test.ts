import { describe, expect, it } from "vitest";
import { assessScope, autoBucketFeatures } from "@/lib/scope/meter";

describe("scope meter", () => {
  it("buckets common scope traps into do_not_build", () => {
    const features = autoBucketFeatures([
      { name: "Core list", description: "Main list view", complexity: "low" },
      { name: "Create item", description: "Add records", complexity: "low" },
      { name: "Mark done", description: "Complete records", complexity: "low" },
      { name: "Payment reminders", description: "Send SMS", complexity: "high" },
      { name: "Subscription billing", description: "Charge monthly", complexity: "high" },
    ]);

    expect(features.find((f) => f.name === "Payment reminders")?.bucket).toBe("do_not_build");
    expect(features.find((f) => f.name === "Subscription billing")?.bucket).toBe("do_not_build");
    expect(features.filter((f) => f.bucket === "build_now").length).toBeGreaterThan(0);
  });

  it("scores overloaded scopes lower", () => {
    const lean = assessScope(
      autoBucketFeatures([
        { name: "A", description: "a", complexity: "low" },
        { name: "B", description: "b", complexity: "low" },
        { name: "C", description: "c", complexity: "low" },
      ]),
      { screenCount: 3, mustHaveAuth: false, dataMode: "local_demo" },
    );

    const heavy = assessScope(
      [
        {
          id: "1",
          name: "Realtime chat",
          description: "chat",
          bucket: "build_now",
          reason: "x",
          complexity: "high",
        },
        {
          id: "2",
          name: "Payments",
          description: "pay",
          bucket: "build_now",
          reason: "x",
          complexity: "high",
        },
        {
          id: "3",
          name: "Admin analytics",
          description: "charts",
          bucket: "build_now",
          reason: "x",
          complexity: "high",
        },
      ],
      { screenCount: 8, mustHaveAuth: true, dataMode: "online_multiplayer" },
    );

    expect(lean.score).toBeGreaterThan(heavy.score);
    expect(heavy.label).toBe("Overloaded");
  });
});
