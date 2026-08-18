import { cancel, confirm, isCancel } from "@clack/prompts";
import { loadConfig } from "../lib/config.js";
import { renderSummary } from "../lib/summary.js";

export async function runAll(opts: { dryRun?: boolean }): Promise<void> {
  let cfg = loadConfig();
  if (!cfg) {
    console.log("No config found — running init flow first.");
    const { runInit } = await import("./init.js");
    await runInit(opts);
    cfg = loadConfig();
    if (!cfg) {
      console.error("Init cancelled or failed — cannot proceed.");
      return;
    }
  }

  const { runReadme } = await import("./readme.js");
  const { runShots } = await import("./shots.js");
  const { runSocial } = await import("./social.js");
  const { runLanding } = await import("./landing.js");

  console.log(`\n─── Step 1/3: README ───`);
  console.log(`    Using model: ${process.env.AI_MODEL ?? "default"}\n`);
  await runReadme(opts);

  console.log("\n─── Step 2/3: Screenshots ───");
  await runShots(opts);

  console.log("\n─── Step 3/3: Social drafts ───");
  await runSocial(opts);

  console.log("\n─── Optional: Landing page ───");
  const wantsLanding = await confirm({
    message: "Generate a landing page too?",
  });
  if (isCancel(wantsLanding)) {
    cancel("Skipped landing.");
  } else if (wantsLanding) {
    await runLanding({ ...opts, study: undefined });
  }

  console.log("\n");
  const summary = renderSummary(process.cwd());
  if (summary) console.log(summary);
  else console.log("No files generated.");
}
