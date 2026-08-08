import { describe, expect, it } from "vitest";
import { trimBlueprintHistory } from "@/lib/store/projects";
import type { ProjectBlueprint } from "@/lib/schema";
import {
  MAX_CHAT_MESSAGES,
  MAX_DOCUMENT_VERSIONS,
} from "@/lib/schema/limits";

function makeBlueprint(overrides: Partial<ProjectBlueprint> = {}): ProjectBlueprint {
  return {
    id: "proj-1",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    rawIdea: "idea",
    answers: {},
    decisions: {
      productName: "Demo",
      oneLiner: "One liner",
      targetUser: "User",
      coreProblem: "Problem",
      primaryJourney: "Journey",
      mustHaveAuth: false,
      dataMode: "local_demo",
      recommendedStack: ["Next.js"],
      risks: [],
    },
    features: [],
    screens: [],
    entities: [],
    acceptanceCriteria: [],
    scope: {
      score: 50,
      label: "Balanced MVP",
      summary: "ok",
      reasons: [],
      recommendedCuts: [],
    },
    documents: [],
    artifacts: [],
    chat: [],
    versions: [],
    provider: "demo",
    hasScreenshot: false,
    ...overrides,
  };
}

describe("trimBlueprintHistory", () => {
  it("returns the same object when already within caps", () => {
    const blueprint = makeBlueprint({
      chat: [{ id: "m1", role: "user", text: "hi", createdAt: "2026-08-01T00:00:00.000Z" }],
      versions: [
        {
          id: "v1",
          documentKey: "01_PRD",
          content: "old",
          summary: "change",
          createdAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    });

    expect(trimBlueprintHistory(blueprint)).toBe(blueprint);
  });

  it("keeps the newest chat messages and version entries", () => {
    const chat = Array.from({ length: MAX_CHAT_MESSAGES + 3 }, (_, index) => ({
      id: `m${index}`,
      role: "user" as const,
      text: `msg-${index}`,
      createdAt: new Date(index).toISOString(),
    }));
    const versions = Array.from({ length: MAX_DOCUMENT_VERSIONS + 2 }, (_, index) => ({
      id: `v${index}`,
      documentKey: "01_PRD" as const,
      content: `content-${index}`,
      summary: `summary-${index}`,
      createdAt: new Date(index).toISOString(),
    }));

    const trimmed = trimBlueprintHistory(makeBlueprint({ chat, versions }));

    expect(trimmed.chat).toHaveLength(MAX_CHAT_MESSAGES);
    expect(trimmed.chat[0]?.text).toBe("msg-3");
    expect(trimmed.chat.at(-1)?.text).toBe(`msg-${MAX_CHAT_MESSAGES + 2}`);

    expect(trimmed.versions).toHaveLength(MAX_DOCUMENT_VERSIONS);
    expect(trimmed.versions[0]?.content).toBe(`content-${MAX_DOCUMENT_VERSIONS + 1}`);
    expect(trimmed.versions.at(-1)?.content).toBe("content-2");
  });

  it("preserves the newest version for each user-refined document when trimming", () => {
    const fillerVersions = Array.from({ length: MAX_DOCUMENT_VERSIONS }, (_, index) => ({
      id: `f${index}`,
      documentKey: "01_PRD" as const,
      content: `filler-${index}`,
      summary: `summary-${index}`,
      createdAt: new Date(index + 1_000).toISOString(),
    }));
    const refinedVersion = {
      id: "design-refined",
      documentKey: "02_DESIGN_SYSTEM" as const,
      content: "user-refined-design",
      summary: "Refined palette",
      createdAt: new Date(0).toISOString(),
    };

    const trimmed = trimBlueprintHistory(
      makeBlueprint({
        documents: [
          {
            key: "02_DESIGN_SYSTEM",
            title: "Design System",
            content: "user-refined-design",
            isDetailed: true,
          },
        ],
        versions: [...fillerVersions, refinedVersion],
      }),
    );

    expect(trimmed.versions).toHaveLength(MAX_DOCUMENT_VERSIONS);
    expect(
      trimmed.versions.some(
        (version) =>
          version.documentKey === "02_DESIGN_SYSTEM" &&
          version.content === "user-refined-design",
      ),
    ).toBe(true);
  });
});
