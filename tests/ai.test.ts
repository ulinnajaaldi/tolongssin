import { describe, expect, it, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import { AiError, generateJSON, generateMarkdown, getFallbackModels, sanitizeModelText, textOrReasoning } from '../src/lib/ai.js'

vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: vi.fn(() => ({
    languageModel: vi.fn((modelId: string) => ({ modelId })),
  })),
}))

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  generateObject: vi.fn(),
}))

vi.mock('ai', () => ({
  generateText: mocks.generateText,
  generateObject: mocks.generateObject,
}))

beforeEach(() => {
  mocks.generateText.mockReset()
  mocks.generateObject.mockReset()
  process.env.OPENAI_API_KEY = 'sk-test-123'
  process.env.AI_API_KEY = ''
  delete process.env.AI_BASE_URL
  delete process.env.AI_MODEL
})

describe('generateMarkdown', () => {
  it('returns generated markdown from generateText', async () => {
    mocks.generateText.mockResolvedValue({ text: '## Hello\n\nA CLI tool that generates marketing kits from your repo.' })
    await expect(generateMarkdown('write hello')).resolves.toBe('## Hello\n\nA CLI tool that generates marketing kits from your repo.')
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining('write hello'), model: expect.objectContaining({ modelId: 'gpt-4o-mini' }) }),
    )
  })

  it('rejects with AiError when the API key is missing', async () => {
    process.env.OPENAI_API_KEY = ''
    process.env.AI_API_KEY = ''
    await expect(generateMarkdown('x')).rejects.toBeInstanceOf(AiError)
    await expect(generateMarkdown('x')).rejects.toThrow('Missing API key')
  })

  it('maps 401 errors to a friendly AiError and never leaks the key', async () => {
    mocks.generateText.mockRejectedValue(new Error('401 invalid api key sk-test-123'))
    const err = await generateMarkdown('x').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AiError)
    const message = (err as Error).message
    expect(message).toContain('401')
    expect(message).not.toContain('sk-test-123')
  })

  it('maps timeout errors to a friendly AiError', async () => {
    mocks.generateText.mockRejectedValue(new Error('request timed out'))
    await expect(generateMarkdown('x')).rejects.toThrow('timed out')
  })

  it('falls back to a working model when configured model returns planning text', async () => {
    mocks.generateText
      .mockResolvedValueOnce({ text: "Let me check the working directory first." })   // configured model → planning
      .mockResolvedValueOnce({ text: '# Real\n\nContent here.' })                      // fallback model → real
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '{"choices":[{"message":{"content":"OK"}}]}',
    }))
    const out = await generateMarkdown('write readme')
    expect(out).toContain('# Real')
    vi.unstubAllGlobals()
  })

  it('throws friendly error when no fallback model works', async () => {
    mocks.generateText.mockResolvedValue({ text: "Let me check first." })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => '' }))
    await expect(generateMarkdown('write readme')).rejects.toThrow('no fallback model worked')
    vi.unstubAllGlobals()
  })

  it('generateMarkdown throws friendly error when output is empty and no fallback works', async () => {
    mocks.generateText.mockResolvedValue({ text: 'Let me check the working directory first.' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(generateMarkdown('write readme')).rejects.toThrow('AI returned empty content')
    vi.unstubAllGlobals()
  })
})

describe('generateJSON', () => {
  it('returns the typed object from generateObject', async () => {
    mocks.generateObject.mockResolvedValue({ object: { ok: true } })
    const schema = z.object({ ok: z.boolean() })
    await expect(generateJSON('parse me', schema)).resolves.toEqual({ ok: true })
    expect(mocks.generateObject).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining('parse me'), schema }),
    )
  })
})

describe('getFallbackModels', () => {
  it('returns env AI_FALLBACK_MODELS when set (comma-separated, trimmed)', () => {
    process.env.AI_FALLBACK_MODELS = 'free-app, groq/llama-3.3-70b-versatile,'
    expect(getFallbackModels()).toEqual(['free-app', 'groq/llama-3.3-70b-versatile'])
  })

  it('falls back to MODEL_FALLBACKS when env is empty/unset', () => {
    delete process.env.AI_FALLBACK_MODELS
    const models = getFallbackModels()
    expect(models.length).toBeGreaterThan(0)
    expect(models).toContain('groq/llama-3.3-70b-versatile')
  })
})

describe('textOrReasoning', () => {
  it('returns genuine text when present', () => {
    const real = '# Demo\n\nA CLI tool that generates marketing kits from your repo.'
    expect(textOrReasoning({ text: real })).toBe(real)
  })

  it('rejects planning prose with no markdown structure', () => {
    const planning = "I'll quickly verify the actual CLI commands and structure before rewriting the README, so the quickstart is accurate."
    expect(textOrReasoning({ text: planning })).toBe('')
  })

  it('strips tool-call blocks', () => {
    const dirty = '<tool_calls>\n<invoke name="read_file"><parameter name="file">/app/package.json</parameter></invoke>\n</tool_calls>\n# Real README\n\nBody here.'
    expect(textOrReasoning({ text: dirty })).toBe('# Real README\n\nBody here.')
  })

  it('keeps genuine reasoning when text is planning', () => {
    const reasoning = '# API\n\nGenerate marketing kits from repo metadata.'
    expect(textOrReasoning({ text: 'Let me check the working directory first.', reasoning_content: reasoning })).toBe(reasoning)
  })

  it('reads AI SDK v7 `reasoning` field (not just reasoning_content)', () => {
    const reasoning = '# Real content\n\nFrom the reasoning field.'
    expect(textOrReasoning({ text: '', reasoning: reasoning })).toBe(reasoning)
    expect(textOrReasoning({ text: 'planning only', reasoning: reasoning })).toBe(reasoning)
  })
})

describe('sanitizeModelText', () => {
  it('keeps JSON output (generateJSON flow)', () => {
    const json = '{"projectName":"qcli","valueProp":"Zero-config scaffolding","audience":"Developers","primaryCta":"npx qcli init"}'
    expect(sanitizeModelText(json)).toBe(json)
  })

  it('keeps X thread format (1/5 numbering)', () => {
    const thread = 'Screenshot Hook: Terminal output.\n\n1/5\nWhy is verifying still a manual headache?\n\nIntroducing `test-proj`. 🧵\n\n2/5\nWe got tired of scratch scripts.'
    expect(sanitizeModelText(thread)).toBe(thread)
  })

  it('keeps LinkedIn multi-paragraph prose', () => {
    const post = 'We built test-proj because verifying integrations was a pain.\n\nNow it is a 10-second check.\n\n#devtools #testing'
    expect(sanitizeModelText(post)).toBe(post)
  })

  it('keeps single-paragraph prose (README descriptions)', () => {
    const desc = '**test-proj** is a command-line tool for scaffolding, managing, and testing project templates directly from your terminal. It streamlines common project setup tasks so you can spin up or validate a project structure with a single command. Designed for developers who want speed without sacrificing reproducibility.'
    expect(sanitizeModelText(desc)).toBe(desc)
  })

  it('rejects planning prose that contains only a bare list', () => {
    const planning = "Let me look at the project files.\n\nI found the repo structure. Let me set up a todo plan for this writing task.\n\n- Draft tagline\n- Draft description"
    expect(sanitizeModelText(planning)).toBe('')
  })

  it('rejects tool-call planning prose', () => {
    const planning = "I'll take a quick look at the repo to ground the post.\n\nLet me check the repository contents and README.\n\n<tool_calls>\n<invoke name=\"read_file\"><parameter name=\"file\">/app/package.json</parameter></invoke>\n</tool_calls>"
    expect(sanitizeModelText(planning)).toBe('')
  })
})
