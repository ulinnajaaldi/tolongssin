import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RepoType } from './config.js'

export interface RepoInfo {
  name?: string
  description?: string
  keywords?: string[]
  repoUrl?: string
  repoType: RepoType
  isWebApp: boolean
  hasBin: boolean
  hasDevScript?: string
  confidence: 'high' | 'medium' | 'low'
  dependencies?: string[]
  fileStructure?: string[]
}

const WEBAPP_DEPS = ['next', 'vue', 'svelte', '@angular/core', 'vite', 'nuxt', 'remix', 'gatsby']

function readJson(path: string): Record<string, unknown> | null {
  const text = readText(path)
  if (text === null) return null
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

function readText(path: string): string | null {
  if (!existsSync(path)) return null
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

function normalizeRepoUrl(url: string): string {
  const stripped = url.replace(/^git\+/, '')
  const ssh = stripped.match(/^git@([^:]+):(.+)$/)
  const target = ssh ? `https://${ssh[1]}/${ssh[2]}` : stripped
  return target.replace(/\.git$/, '')
}

function depsOf(pkg: Record<string, unknown> | null, key: string): string[] {
  const value = pkg?.[key]
  if (typeof value !== 'object' || value === null) return []
  return Object.keys(value as Record<string, unknown>)
}

function topLevelEntries(cwd: string): string[] {
  try {
    const entries = readdirSync(cwd, { withFileTypes: true })
    return entries
      .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist' && e.name !== 'marketing-kit' && e.name !== 'graphify-out')
      .slice(0, 30)
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
  } catch {
    return []
  }
}

export function analyzeRepo(cwd: string): RepoInfo {
  const pkg = readJson(join(cwd, 'package.json'))
  const pkgText = readText(join(cwd, 'package.json')) ?? ''
  const pyprojectText = readText(join(cwd, 'pyproject.toml')) ?? ''
  const manifest = readJson(join(cwd, 'manifest.json'))

  const deps = depsOf(pkg, 'dependencies')
  const devDeps = depsOf(pkg, 'devDependencies')
  const allDeps = [...deps, ...devDeps]
  const hasReact = allDeps.includes('react')
  const hasReactDom = allDeps.includes('react-dom')
  const hasWebFrameworkDep = WEBAPP_DEPS.some((dep) => allDeps.includes(dep))
  const hasPyWeb = /(?:fastapi|django|flask)\b/.test(pyprojectText)
  const hasIndexHtml = existsSync(join(cwd, 'index.html'))
  const isWebApp = hasWebFrameworkDep || (hasReact && hasReactDom) || hasPyWeb || hasIndexHtml

  const hasObsidianDir = existsSync(join(cwd, '.obsidian'))
  const manifestHasMinAppVersion = typeof manifest?.minAppVersion === 'string'
  const hasPublisher = typeof pkg?.publisher === 'string'
  const hasContributes = 'contributes' in (pkg ?? {})
  const isPlugin = hasObsidianDir || manifestHasMinAppVersion || hasPublisher || hasContributes

  const hasBin = pkg?.bin !== undefined
  const hasPyCli = /\[project\.scripts\]/.test(pyprojectText)
  const isCli = hasBin || hasPyCli

  const hasExportsOrMain = pkg?.exports !== undefined || pkg?.main !== undefined
  let hasPyPackage = false
  let entries: string[] = []
  try {
    entries = readdirSync(cwd, { withFileTypes: true }).map((e) => e.name)
  } catch {
    entries = []
  }
  for (const entry of entries) {
    if (existsSync(join(cwd, entry, '__init__.py'))) {
      hasPyPackage = true
      break
    }
  }
  const isLib = (hasExportsOrMain && !hasBin) || (hasPyPackage && !isCli)

  const signals: Array<[RepoType, boolean]> = [
    ['webapp', isWebApp],
    ['plugin', isPlugin],
    ['cli', isCli],
    ['lib', isLib],
  ]
  const trueSignals = signals.filter(([, signal]) => signal)
  const repoType: RepoType = trueSignals.length > 0 ? trueSignals[0][0] : 'other'
  const confidence: RepoInfo['confidence'] =
    trueSignals.length === 1 ? 'high' : trueSignals.length > 1 ? 'medium' : 'low'

  const repository = pkg?.repository
  const repositoryUrl =
    typeof repository === 'string'
      ? normalizeRepoUrl(repository)
      : typeof repository === 'object' && repository !== null && typeof (repository as { url?: unknown }).url === 'string'
        ? normalizeRepoUrl((repository as { url: string }).url)
        : undefined

  const keywordsValue = pkg?.keywords
  const keywords = Array.isArray(keywordsValue)
    ? keywordsValue.filter((k): k is string => typeof k === 'string')
    : undefined

  const scripts = pkg?.scripts
  const hasDevScript =
    typeof scripts === 'object' && scripts !== null
      ? (['dev', 'start', 'preview'] as const).find((script) => typeof (scripts as Record<string, unknown>)[script] === 'string')
      : undefined

  return {
    name: typeof pkg?.name === 'string' ? pkg.name : undefined,
    description: typeof pkg?.description === 'string' ? pkg.description : undefined,
    keywords,
    repoUrl: repositoryUrl,
    repoType,
    isWebApp,
    hasBin,
    hasDevScript,
    confidence,
    dependencies: allDeps,
    fileStructure: topLevelEntries(cwd),
  }
}
