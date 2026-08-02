import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("pre-push hook", () => {
  it("reads git pre-push stdin as four fields (local ref/sha, remote ref/sha)", () => {
    const hook = readFileSync(".githooks/pre-push", "utf8");
    expect(hook).toMatch(/read -r local_ref local_sha remote_ref remote_sha/);
    expect(hook).not.toMatch(
      /read -r _ local_ref local_sha remote_ref remote_sha/,
    );
  });
});
