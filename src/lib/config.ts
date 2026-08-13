import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type RepoType = 'cli' | 'lib' | 'webapp' | 'plugin' | 'other'

export interface TolongssinConfig {
  projectName: string
  valueProp: string
  audience: string
  repoType: RepoType
  primaryCta?: string
  screenshots?: { breakpoints: string[]; sections?: string[]; url?: string }
  landingPage?: { accentHue?: string; macrostructure?: string; macrostructureHistory?: string[] }
}

export function configPath(): string {
  return join('.tolongssin', 'config.json')
}

export function envPath(): string {
  return join('.tolongssin', '.env')
}

export function loadConfig(): TolongssinConfig | null {
  const path = configPath()
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as TolongssinConfig
  } catch {
    return null
  }
}

export function saveConfig(cfg: TolongssinConfig): void {
  const dir = '.tolongssin'
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(configPath(), `${JSON.stringify(cfg, null, 2)}\n`, 'utf8')
}

export function ensureGitignore(): void {
  const entries = ['.tolongssin/.env', 'marketing-kit/']
  const path = '.gitignore'
  const content = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const lines = content.split(/\r?\n/)
  const missing = entries.filter((entry) => !lines.some((line) => line.trim() === entry))
  if (missing.length === 0) return
  const addition = `${missing.join('\n')}\n`
  writeFileSync(path, content.endsWith('\n') || content === '' ? `${content}${addition}` : `${content}\n${addition}`, 'utf8')
}
