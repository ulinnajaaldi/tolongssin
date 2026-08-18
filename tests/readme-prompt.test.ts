import { describe, expect, it } from "vitest";
import { buildReadmePrompt } from "../src/templates/readme-prompt.js";
import type { RepoType } from "../src/lib/config.js";

const base = {
  projectName: "Demo",
  valueProp: "Saves time",
  audience: "Devs",
  repoType: "cli" as RepoType,
  repoInfo: {},
  existingReadme: null,
};

describe("buildReadmePrompt", () => {
  it("omits roadmap, contributing, and license sections", () => {
    const prompt = buildReadmePrompt(base);
    expect(prompt).not.toMatch(/\d+\.\s*Roadmap/i);
    expect(prompt).not.toContain("Contributing");
    expect(prompt).not.toContain("License");
  });

  it("keeps quickstart and features sections", () => {
    const prompt = buildReadmePrompt(base);
    expect(prompt).toContain("Quickstart");
    expect(prompt).toContain("Features");
  });
});
