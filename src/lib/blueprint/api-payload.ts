import type { ProjectBlueprint } from "@/lib/schema";

/** Strip rebuildable/heavy fields before sending a blueprint to server APIs. */
export function blueprintForApiPayload(bp: ProjectBlueprint): ProjectBlueprint {
  return {
    ...bp,
    artifacts: [],
    coherence: undefined,
  };
}

export function serializeBlueprintForApi(bp: ProjectBlueprint): string {
  return JSON.stringify(blueprintForApiPayload(bp));
}
