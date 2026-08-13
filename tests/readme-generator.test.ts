import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { backupFileName, generateReadme, scrubSecrets } from '../src/lib/readme-generator.js'
import type { RepoInfo } from '../src/lib/analyzer.js'
import type { TolongssinConfig } from '../src/lib/config.js'

const mocks = vi.hoisted(() => ({
  generateMarkdown: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(),
  cancel: vi.fn(),
}))

vi.mock('../src/lib/ai.js', () => ({ generateMarkdown: mocks.generateMarkdown }))
vi.mock('@clack/prompts', () => ({
  confirm: mocks.confirm,
  isCancel: mocks.isCancel,
  cancel: mocks.cancel,
}))

const repoInfo: RepoInfo = { repoType: 'cli', isWebApp: false, hasBin: true, confidence: 'high', name: 'demo-cli' }
const cfg: TolongssinConfig = { projectName: 'Demo', valueProp: 'Saves time', audience: 'Devs', repoType: 'cli' }

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tolongssin-readme-'))
  mocks.generateMarkdown.mockResolvedValue('# Demo\n\nHook line\n')
  mocks.isCancel.mockReturnValue(false)
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('generateReadme', () => {
  it('dry-run writes nothing', async () => {
    await generateReadme(repoInfo, cfg, { dryRun: true }, dir)
    expect(existsSync(join(dir, 'marketing-kit'))).toBe(false)
    expect(existsSync(join(dir, 'README.md'))).toBe(false)
  })

  it('dry-run passes value-prop prompt', async () => {
    await generateReadme(repoInfo, cfg, { dryRun: true }, dir)
    expect(mocks.generateMarkdown).toHaveBeenCalledWith(expect.stringContaining('Value proposition: Saves time'))
  })

  it('confirm yes -> write + backup', async () => {
    writeFileSync(join(dir, 'README.md'), 'old readme', 'utf8')
    mocks.confirm.mockResolvedValue(true)
    await generateReadme(repoInfo, cfg, {}, dir)
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe('# Demo\n\nHook line\n')
    const backups = readdirSync(join(dir, '.tolongssin', 'backups'))
    expect(backups).toHaveLength(1)
    expect(readFileSync(join(dir, '.tolongssin', 'backups', backups[0]), 'utf8')).toBe('old readme')
  })

  it('confirm no -> draft only', async () => {
    writeFileSync(join(dir, 'README.md'), 'old', 'utf8')
    mocks.confirm.mockResolvedValue(false)
    await generateReadme(repoInfo, cfg, {}, dir)
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe('old')
    expect(readFileSync(join(dir, 'marketing-kit', 'README.draft.md'), 'utf8')).toBe('# Demo\n\nHook line\n')
  })

  it('no existing README -> no backup', async () => {
    mocks.confirm.mockResolvedValue(true)
    await generateReadme(repoInfo, cfg, {}, dir)
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe('# Demo\n\nHook line\n')
    expect(existsSync(join(dir, '.tolongssin', 'backups'))).toBe(false)
  })

  it('secrets never reach the prompt', async () => {
    writeFileSync(join(dir, 'README.md'), 'key sk-abc1234567890 here', 'utf8')
    mocks.confirm.mockResolvedValue(true)
    await generateReadme(repoInfo, cfg, {}, dir)
    const prompt = mocks.generateMarkdown.mock.calls[0][0] as string
    expect(prompt).not.toContain('sk-abc1234567890')
  })
})

describe('scrubSecrets', () => {
  it('redacts secrets', () => {
    const out = scrubSecrets('key sk-abc1234567890 here\nOPENAI_API_KEY=sk-xyz\n')
    expect(out).toContain('[REDACTED]')
    expect(out).not.toContain('sk-abc1234567890')
    expect(out).not.toContain('sk-xyz')
  })
})

describe('backupFileName', () => {
  it('formats a timestamped backup name', () => {
    expect(backupFileName(new Date(2026, 7, 10, 9, 5, 3))).toMatch(/^README\.md\.20260810-090503$/)
  })
})
