import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { spinner } from '@clack/prompts'
import { analyzeRepo } from '../lib/analyzer.js'
import { getSettings } from '../lib/ai.js'
import { askProjectInfo, handleCancel } from '../lib/prompts.js'
import { suggestConfig } from '../lib/suggest.js'
import { configPath, ensureGitignore, envPath, loadConfig, saveConfig } from '../lib/config.js'
import type { TolongssinConfig } from '../lib/config.js'

const ENV_TEMPLATE = `OPENAI_API_KEY=
AI_BASE_URL=
AI_MODEL=
`

export async function runInit(opts: { dryRun?: boolean }): Promise<void> {
  const saved = loadConfig() ?? undefined

  if (opts.dryRun) {
    const plan = saved ?? {
      projectName: '<project name>',
      valueProp: '<one-line value proposition>',
      audience: '<target audience>',
      repoType: 'other',
    }
    console.log('Dry run — nothing will be written.')
    console.log(`${configPath()} ->`)
    console.log(JSON.stringify(plan, null, 2))
    console.log(`${envPath()} ->`)
    console.log(ENV_TEMPLATE.trimEnd())
    return
  }

  const info = analyzeRepo(process.cwd())
  console.log(`Detected repo type: ${info.repoType} (${info.confidence} confidence)`)
  const existing = loadConfig()
  const detected = existing ?? {
    ...(info.name ? { projectName: info.name } : {}),
    repoType: info.repoType,
  }

  let suggestions = null
  const { apiKey } = getSettings()
  if (apiKey) {
    const s = spinner({ indicator: 'dots' })
    s.start('AI infers from repo metadata...')
    suggestions = await suggestConfig(info)
    s.stop(suggestions ? 'Suggestions ready.' : 'No suggestions — fill manually.')
  }

  const answers = await askProjectInfo(detected, suggestions)
  if (!answers) {
    handleCancel()
    return
  }

  saveConfig(answers)
  if (!existsSync(envPath())) {
    mkdirSync('.tolongssin', { recursive: true })
    writeFileSync(envPath(), ENV_TEMPLATE, 'utf8')
  }
  ensureGitignore()

  console.log(`Created ${configPath()}`)
  console.log(`${existsSync(envPath()) ? 'Ensured' : 'Created'} ${envPath()}`)
  console.log('Added .tolongssin/.env and marketing-kit/ to .gitignore (if missing)')
}
