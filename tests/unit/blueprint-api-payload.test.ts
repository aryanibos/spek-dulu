import { describe, expect, it } from "vitest";
import { buildArtifacts, enrichBlueprint } from "@/lib/artifacts/render";
import { buildDemoBlueprint } from "@/lib/demos/preset";
import {
  blueprintForApiPayload,
  serializeBlueprintForApi,
} from "@/lib/blueprint/api-payload";
import { artifactSchema, projectBlueprintSchema, refineRequestSchema } from "@/lib/schema";
import { MAX_ARTIFACT_CONTENT, MAX_DOC_CONTENT } from "@/lib/schema/limits";

describe("blueprint API payload", () => {
  it("strips artifacts and coherence from server-bound payloads", () => {
    const bp = enrichBlueprint(buildDemoBlueprint("A todo app for students", {}));
    expect(bp.artifacts.length).toBeGreaterThan(0);
    expect(bp.coherence).toBeDefined();

    const payload = blueprintForApiPayload(bp);
    expect(payload.artifacts).toEqual([]);
    expect(payload.coherence).toBeUndefined();
    expect(payload.chat).toEqual([]);
    expect(payload.versions).toEqual([]);
    expect(payload.documents).toEqual(bp.documents);
  });

  it("keeps refine requests under the blueprintJson cap with heavy version and chat history", () => {
    const bp = enrichBlueprint(buildDemoBlueprint("A todo app for students", {}));
    const heavy = enrichBlueprint({
      ...bp,
      versions: Array.from({ length: 10 }, (_, index) => ({
        id: `ver_${index}`,
        documentKey: "prd" as const,
        content: "v".repeat(40_000),
        summary: "Snapshot",
        createdAt: new Date().toISOString(),
      })),
      chat: Array.from({ length: 50 }, (_, index) => ({
        id: `msg_${index}`,
        role: "user" as const,
        text: "c".repeat(3_000),
        createdAt: new Date().toISOString(),
      })),
    });

    const fullJson = JSON.stringify(heavy);
    const apiJson = serializeBlueprintForApi(heavy);
    expect(fullJson.length).toBeGreaterThan(500_000);
    expect(apiJson.length).toBeLessThan(500_000);

    const refinePayload = refineRequestSchema.safeParse({
      projectId: heavy.id,
      fileName: heavy.documents[0]!.fileName,
      userQuery: "Tighten scope",
      blueprintJson: apiJson,
    });
    expect(refinePayload.success).toBe(true);
  });

  it("keeps refine/visual requests under the blueprintJson cap when docs are large", () => {
    const bp = enrichBlueprint(buildDemoBlueprint("A todo app for students", {}));
    const largeDoc = "x".repeat(70_000);
    const heavy = enrichBlueprint({
      ...bp,
      documents: bp.documents.map((doc, index) =>
        index < 4 ? { ...doc, content: largeDoc } : doc,
      ),
    });

    const fullJson = JSON.stringify(heavy);
    const apiJson = serializeBlueprintForApi(heavy);
    expect(fullJson.length).toBeGreaterThan(500_000);
    expect(apiJson.length).toBeLessThan(500_000);

    const refinePayload = refineRequestSchema.safeParse({
      projectId: heavy.id,
      fileName: heavy.documents[0]!.fileName,
      userQuery: "Tighten scope",
      blueprintJson: apiJson,
    });
    expect(refinePayload.success).toBe(true);
  });

  it("caps artifact content at the document limit", () => {
    const result = artifactSchema.safeParse({
      path: "docs/01_PRD.md",
      content: "x".repeat(MAX_ARTIFACT_CONTENT + 1),
    });
    expect(result.success).toBe(false);
  });

  it("accepts artifacts produced by buildArtifacts", () => {
    const bp = enrichBlueprint(buildDemoBlueprint("A todo app for students", {}));
    for (const artifact of buildArtifacts(bp)) {
      expect(artifact.content.length).toBeLessThanOrEqual(MAX_DOC_CONTENT);
      expect(artifactSchema.safeParse(artifact).success).toBe(true);
    }
    expect(projectBlueprintSchema.safeParse(bp).success).toBe(true);
  });
});
