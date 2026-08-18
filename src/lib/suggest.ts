import { z } from "zod";
import { generateJSON } from "./ai.js";
import type { RepoInfo } from "./analyzer.js";

const SuggestionSchema = z.object({
  projectName: z
    .string()
    .describe("The project name, derived from package.json name or repo name"),
  valueProp: z
    .string()
    .describe("A concise one-line value proposition (max 80 chars)"),
  audience: z
    .string()
    .describe(
      'Target audience (e.g. "Developers shipping side projects", "DevOps engineers")',
    ),
  primaryCta: z
    .string()
    .describe(
      'A short call-to-action button text (e.g. "Get started", "Try it", "Star on GitHub")',
    ),
});

export type Suggestions = z.infer<typeof SuggestionSchema>;

export async function suggestConfig(
  info: RepoInfo,
): Promise<Suggestions | null> {
  const meta = [
    info.name ? `Name: ${info.name}` : null,
    info.description ? `Description: ${info.description}` : null,
    info.keywords?.length ? `Keywords: ${info.keywords.join(", ")}` : null,
    info.repoUrl ? `URL: ${info.repoUrl}` : null,
    `Detected type: ${info.repoType}`,
    info.dependencies?.length
      ? `Dependencies: ${info.dependencies.join(", ")}`
      : null,
    info.fileStructure?.length
      ? `Top-level files: ${info.fileStructure.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    return await generateJSON(
      `Based on this repository metadata, suggest a config for a marketing kit CLI.
The CLI will generate README, landing page, screenshots, and social drafts.

Repository metadata:
${meta}

Rules:
- projectName: use the package.json name (cleaned up, no hyphens if possible)
- valueProp: one sentence, specific, no buzzwords. Focus on what problem it solves.
- audience: who benefits most from this tool?
- primaryCta: action-oriented, short (2-3 words max)`,
      SuggestionSchema,
    );
  } catch {
    return null;
  }
}
