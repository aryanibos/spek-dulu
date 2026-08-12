import type { ProjectBlueprint } from "@/lib/schema";

export type BlueprintApiPayloadOptions = {
  /** Visual routes only use decisions/screens/features — not document bodies. */
  stripDocumentContent?: boolean;
  /** Refine only reads one document; strip the rest to stay under blueprintJson cap. */
  keepDocumentFileName?: string;
};

function stripHeavyBlueprintFields(bp: ProjectBlueprint): ProjectBlueprint {
  return {
    ...bp,
    artifacts: [],
    coherence: undefined,
    chat: [],
    versions: [],
  };
}

/** Strip rebuildable/heavy fields before sending a blueprint to server APIs. */
export function blueprintForApiPayload(
  bp: ProjectBlueprint,
  options: BlueprintApiPayloadOptions = {},
): ProjectBlueprint {
  const payload = stripHeavyBlueprintFields(bp);

  if (options.stripDocumentContent) {
    return {
      ...payload,
      documents: payload.documents.map((doc) => ({ ...doc, content: "" })),
    };
  }

  if (options.keepDocumentFileName) {
    const keep = options.keepDocumentFileName;
    return {
      ...payload,
      documents: payload.documents.map((doc) =>
        doc.fileName === keep ? doc : { ...doc, content: "" },
      ),
    };
  }

  return payload;
}

export function serializeBlueprintForApi(
  bp: ProjectBlueprint,
  options: BlueprintApiPayloadOptions = {},
): string {
  return JSON.stringify(blueprintForApiPayload(bp, options));
}
