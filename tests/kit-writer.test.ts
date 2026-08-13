import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFileAtomic, ensureKitDir, listKit, kitDir } from '../src/lib/kit-writer.js'
import { renderSummary } from '../src/lib/summary.js'

let dir: string
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'tolongssin-kit-')) })
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('kitDir', () => {
  it('returns marketing-kit path', () => {
    expect(kitDir(dir)).toBe(join(dir, 'marketing-kit'))
  })
})

describe('ensureKitDir', () => {
  it('creates the dir', () => {
    ensureKitDir(dir)
    expect(existsSync(join(dir, 'marketing-kit'))).toBe(true)
  })
})

describe('writeFileAtomic', () => {
  it('writes to target', () => {
    writeFileAtomic('x.md', 'hello', dir)
    expect(readFileSync(join(dir, 'marketing-kit/x.md'), 'utf8')).toBe('hello')
  })

  it('creates subdirectories', () => {
    writeFileAtomic('sub/nested.md', 'deep', dir)
    expect(readFileSync(join(dir, 'marketing-kit/sub/nested.md'), 'utf8')).toBe('deep')
  })

  it('dry-run does not write', () => {
    writeFileAtomic('x.md', 'hello', dir, true)
    expect(existsSync(join(dir, 'marketing-kit/x.md'))).toBe(false)
  })
})

describe('listKit', () => {
  it('returns sorted file list', () => {
    writeFileAtomic('b.md', 'b', dir)
    writeFileAtomic('a.md', 'a', dir)
    expect(listKit(dir)).toEqual(['a.md', 'b.md'])
  })

  it('returns empty for missing dir', () => {
    expect(listKit(dir)).toEqual([])
  })
})

describe('renderSummary', () => {
  it('returns empty string with no files', () => {
    expect(renderSummary(dir)).toBe('')
  })

  it('returns table with files', () => {
    writeFileAtomic('x.md', 'hello', dir)
    expect(renderSummary(dir)).toContain('marketing-kit/')
  })
})
