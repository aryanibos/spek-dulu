import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("pre-push hook", () => {
  it("reads git's 4-field pre-push protocol (not 5)", () => {
    const hook = readFileSync(
      resolve(process.cwd(), ".githooks/pre-push"),
      "utf8",
    );

    expect(hook).toMatch(
      /while read -r local_ref local_sha remote_ref remote_sha; do/,
    );
    expect(hook).not.toMatch(
      /while read -r _ local_ref local_sha remote_ref remote_sha; do/,
    );
  });
});
