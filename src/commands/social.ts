import { analyzeRepo } from '../lib/analyzer.js'
import { loadConfig } from '../lib/config.js'
import { generateSocialDrafts } from '../lib/social-generator.js'

export async function runSocial(opts: { dryRun?: boolean }): Promise<void> {
  const cfg = loadConfig()
  if (!cfg) {
    console.error('No .tolongssin/config.json found — run "tolongssin init" first.')
    return
  }
  const info = analyzeRepo(process.cwd())
  await generateSocialDrafts(cfg, info, opts, process.cwd())
}
