import { analyzeRepo } from "../lib/analyzer.js";
import { loadConfig } from "../lib/config.js";
import { generateLanding } from "../lib/landing-generator.js";

export async function runLanding(opts: {
  dryRun?: boolean;
  study?: string;
}): Promise<void> {
  const cfg = loadConfig();
  if (!cfg) {
    console.error(
      'No .tolongssin/config.json found — run "tolongssin init" first.',
    );
    return;
  }
  const info = analyzeRepo(process.cwd());
  await generateLanding(cfg, opts, process.cwd(), info);
}
