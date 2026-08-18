import type { RepoType } from "../lib/config.js";

export interface ReadmePromptInput {
  projectName: string;
  valueProp: string;
  audience: string;
  repoType: RepoType;
  primaryCta?: string;
  repoInfo: {
    name?: string;
    description?: string;
    keywords?: string[];
    repoUrl?: string;
    dependencies?: string[];
    fileStructure?: string[];
  };
  existingReadme: string | null;
}

export function buildReadmePrompt(input: ReadmePromptInput): string {
  const meta = [
    input.repoInfo.name ? `Name: ${input.repoInfo.name}` : null,
    input.repoInfo.description
      ? `Description: ${input.repoInfo.description}`
      : null,
    input.repoInfo.keywords?.length
      ? `Keywords: ${input.repoInfo.keywords.join(", ")}`
      : null,
    input.repoInfo.repoUrl ? `Repo URL: ${input.repoInfo.repoUrl}` : null,
    input.repoInfo.dependencies?.length
      ? `Dependencies: ${input.repoInfo.dependencies.join(", ")}`
      : null,
    input.repoInfo.fileStructure?.length
      ? `Top-level structure: ${input.repoInfo.fileStructure.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const existing = input.existingReadme
    ? `\nCurrent README to improve (never copy secrets from it):\n"""\n${input.existingReadme.slice(0, 6000)}\n"""`
    : "";

  return `You are writing a README for the project "${input.projectName}".
Value proposition: ${input.valueProp}
Target audience: ${input.audience}
Repo type: ${input.repoType}
${input.primaryCta ? `Primary CTA: ${input.primaryCta}` : ""}

Existing repo metadata:
${meta || "(none)"}
${existing}

Write a README with this structure:
1. Name + one-line value prop (the hook — must appear in the first 3 lines)
2. What it does / why it exists (2-3 sentences, no jargon)
3. Quickstart (exact commands; use ${input.repoType}-appropriate install)
4. Features (bullets, benefit-led, max 6)
5. Screenshots section (placeholders if none exist)

Rules:
- Write in English.
- Short lines. No corporate filler. No "unlock the power of".
- If a section does not apply, omit it — do not pad.
- Do not add LICENSE, CONTRIBUTING, CHANGELOG, or roadmap sections — dedicated files cover them.
- NEVER include API keys, tokens, credentials, or anything that looks like a secret.
- Never invent metrics, testimonials, or contributors.`;
}
