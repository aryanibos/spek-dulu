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

  it("always compares pushes against fetched remote main", () => {
    const hook = readFileSync(".githooks/pre-push", "utf8");
    expect(hook).toMatch(/export GIT_PUSH_BASE="\$remote_main"/);
    expect(hook).not.toMatch(/export GIT_PUSH_BASE=""/);
  });

  it("skips limit check when local main matches fetched remote main", () => {
    const hook = readFileSync(".githooks/pre-push", "utf8");
    expect(hook).toMatch(/local_sha" == "\$remote_main"/);
  });
});
