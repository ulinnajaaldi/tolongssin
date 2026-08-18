import { analyzeRepo } from "../lib/analyzer.js";
import { loadConfig } from "../lib/config.js";
import { generateReadme } from "../lib/readme-generator.js";

export async function runReadme(opts: { dryRun?: boolean }): Promise<void> {
  const cfg = loadConfig();
  if (!cfg) {
    console.error(
      'No .tolongssin/config.json found — run "tolongssin init" first.',
    );
    return;
  }
  const info = analyzeRepo(process.cwd());
  await generateReadme(info, cfg, opts, process.cwd());
}
