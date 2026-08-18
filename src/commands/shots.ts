import { cancel, confirm, isCancel, text } from "@clack/prompts";
import { analyzeRepo } from "../lib/analyzer.js";
import { loadConfig } from "../lib/config.js";
import { runCaptures } from "../lib/playwright-runner.js";
import { startDevServer } from "../lib/server.js";
import {
  buildCapturePlan,
  DEFAULT_PORT,
  sectionFileName,
} from "../lib/shots-options.js";

export async function runShots(opts: { dryRun?: boolean }): Promise<void> {
  const cfg = loadConfig();
  if (!cfg) {
    console.error(
      'No .tolongssin/config.json found — run "tolongssin init" first.',
    );
    return;
  }
  const info = analyzeRepo(process.cwd());
  const { plan, skipReason } = buildCapturePlan(
    opts,
    info.isWebApp,
    cfg.screenshots?.url,
    info.hasDevScript ?? null,
    cfg.screenshots?.sections,
  );
  if (skipReason) {
    console.log(skipReason);
    return;
  }
  if (!plan.url) {
    const url = await text({
      message: "Enter the running app URL",
      placeholder: "http://localhost:5173",
    });
    if (isCancel(url)) {
      cancel("Cancelled");
      return;
    }
    plan.url = url;
  }

  if (opts.dryRun) {
    console.log("--- dry-run: would capture ---");
    console.log(`  desktop-full.png (${plan.url})`);
    console.log(`  mobile-top.png (${plan.url})`);
    for (const [i, sel] of plan.sections.entries())
      console.log(`  ${sectionFileName(i + 1)} (selector "${sel}")`);
    console.log("(nothing launched, nothing written)");
    return;
  }

  let server: { kill: () => void } | null = null;
  if (plan.serverCommand) {
    console.log(`Starting dev server: npm run ${plan.serverCommand}`);
    server = await startDevServer(plan.serverCommand, DEFAULT_PORT);
  }

  try {
    const needsAuth = await confirm({
      message: "Does this app require login?",
    });
    if (isCancel(needsAuth)) {
      cancel("Cancelled");
      return;
    }
    const results = await runCaptures(plan, process.cwd(), needsAuth === true);
    console.log("\nCaptured:");
    for (const r of results)
      console.log(`  ${r.path} (${r.width}x${r.height})`);
  } finally {
    server?.kill();
  }
}
