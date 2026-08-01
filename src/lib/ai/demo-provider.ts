import { enrichBlueprint } from "@/lib/artifacts/render";
import {
  buildDemoBlueprint,
  buildDemoQuestions,
  buildDemoVisual,
} from "@/lib/demos/preset";
import type { AiProvider } from "./types";

export const demoProvider: AiProvider = {
  name: "demo",
  async generateInterview(idea) {
    return buildDemoQuestions(idea);
  },
  async generateBlueprint(idea, answers, options) {
    const blueprint = buildDemoBlueprint(idea, answers);
    if (options?.originalityMode) {
      blueprint.visual = buildDemoVisual(options.originalityMode);
    }
    if (options?.referenceUrl) {
      blueprint.referenceUrl = options.referenceUrl;
    }
    if (options?.screenshotBase64) {
      blueprint.hasScreenshot = true;
    }
    return enrichBlueprint(blueprint);
  },
  async analyzeVisual(input) {
    return buildDemoVisual(input.originalityMode);
  },
  async refineDocument(input) {
    const addition = `\n\n## Refinement Note\n${input.userQuery.trim()}\n\n_Updated by SpekDulu demo provider._`;
    return {
      updatedContent: `${input.currentContent.trim()}${addition}\n`,
      summaryOfChanges: `Added a refinement note for ${input.fileName}.`,
    };
  },
};
