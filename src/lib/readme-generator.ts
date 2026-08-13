import { confirm, isCancel, cancel } from '@clack/prompts'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateMarkdown } from './ai.js'
import type { RepoInfo } from './analyzer.js'
import type { TolongssinConfig } from './config.js'
import { buildReadmePrompt } from '../templates/readme-prompt.js'

export interface ReadmeOptions {
  dryRun?: boolean
}

const SECRET_PATTERNS = [
  /\b(sk-[A-Za-z0-9_-]{8,})\b/g,
  /\b(ghp_[A-Za-z0-9]{20,})\b/g,
  /\b(AKIA[A-Z0-9]{16})\b/g,
  /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/g,
  /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
]

export function scrubSecrets(text: string): string {
  let out = text
  for (const re of SECRET_PATTERNS) out = out.replace(re, '[REDACTED]')
  out = out.replace(/^(\s*[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASS)\s*=\s*).*$/gim, '$1[REDACTED]')
  return out
}

export function backupFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `README.md.${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
}

export async function generateReadme(
  info: RepoInfo,
  cfg: TolongssinConfig,
  opts: Readonly<{ dryRun?: boolean }> = {},
  cwd = process.cwd(),
): Promise<void> {
  const readmePath = join(cwd, 'README.md')
  const existingReadme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : null

  const prompt = buildReadmePrompt({
    projectName: cfg.projectName,
    valueProp: cfg.valueProp,
    audience: cfg.audience,
    repoType: cfg.repoType,
    primaryCta: cfg.primaryCta,
    repoInfo: info,
    existingReadme: existingReadme ? scrubSecrets(existingReadme) : null,
  })

  const draft = await generateMarkdown(prompt)

  if (opts.dryRun) {
    console.log('--- README draft (dry-run, nothing written) ---')
    console.log(draft)
    return
  }

  const kitDir = join(cwd, 'marketing-kit')
  mkdirSync(kitDir, { recursive: true })
  writeFileSync(join(kitDir, 'README.draft.md'), draft, 'utf8')

  const ok = await confirm({ message: 'Write this draft to README.md?' })
  if (isCancel(ok)) {
    cancel('Skipped — draft kept at marketing-kit/README.draft.md')
    return
  }
  if (ok) {
    if (existingReadme !== null) {
      const backupDir = join(cwd, '.tolongssin', 'backups')
      mkdirSync(backupDir, { recursive: true })
      copyFileSync(readmePath, join(backupDir, backupFileName()))
    }
    writeFileSync(readmePath, draft, 'utf8')
    console.log(`README.md written${existingReadme !== null ? '; original backed up to .tolongssin/backups/' : ''}`)
  } else {
    console.log('Draft kept at marketing-kit/README.draft.md — README.md unchanged')
  }
}
