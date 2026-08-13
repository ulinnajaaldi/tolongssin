import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { saveConfig, loadConfig, ensureGitignore, configPath } from '../src/lib/config.js'
import type { TolongssinConfig } from '../src/lib/config.js'

let dir: string
let originalCwd: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tolongssin-cfg-'))
  originalCwd = process.cwd()
  process.chdir(dir)
})

afterEach(() => {
  process.chdir(originalCwd)
  rmSync(dir, { recursive: true, force: true })
})

const fixture: TolongssinConfig = {
  projectName: 'test-proj',
  valueProp: 'Does things',
  audience: 'Devs',
  repoType: 'cli',
}

describe('config round-trip', () => {
  it('saveConfig → loadConfig returns identical object', () => {
    saveConfig(fixture)
    const loaded = loadConfig()
    expect(loaded).toEqual(fixture)
  })

  it('loadConfig returns null when no config exists', () => {
    expect(loadConfig()).toBeNull()
  })

  it('config.json has trailing newline', () => {
    saveConfig(fixture)
    const raw = readFileSync(configPath(), 'utf8')
    expect(raw.endsWith('\n')).toBe(true)
  })
})

describe('dry-run', () => {
  it('no .tolongssin/ dir created without calling saveConfig', () => {
    loadConfig()
    expect(existsSync(join(dir, '.tolongssin'))).toBe(false)
  })
})

describe('.gitignore idempotent', () => {
  it('ensureGitignore creates entries', () => {
    ensureGitignore()
    const content = readFileSync(join(dir, '.gitignore'), 'utf8')
    expect(content).toContain('.tolongssin/.env')
    expect(content).toContain('marketing-kit/')
  })

  it('ensureGitignore is idempotent', () => {
    ensureGitignore()
    ensureGitignore()
    const content = readFileSync(join(dir, '.gitignore'), 'utf8')
    const lines = content.split('\n')
    const envLines = lines.filter((l) => l.trim() === '.tolongssin/.env')
    const kitLines = lines.filter((l) => l.trim() === 'marketing-kit/')
    expect(envLines).toHaveLength(1)
    expect(kitLines).toHaveLength(1)
  })

  it('does not duplicate existing entries', () => {
    writeFileSync(join(dir, '.gitignore'), '.tolongssin/.env\nmarketing-kit/\n', 'utf8')
    ensureGitignore()
    const content = readFileSync(join(dir, '.gitignore'), 'utf8')
    const lines = content.split('\n')
    expect(lines.filter((l) => l.trim() === '.tolongssin/.env')).toHaveLength(1)
    expect(lines.filter((l) => l.trim() === 'marketing-kit/')).toHaveLength(1)
  })
})
