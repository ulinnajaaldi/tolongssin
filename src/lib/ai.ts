import { config as dotenvConfig } from 'dotenv'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { generateObject, generateText } from 'ai'
import { spinner } from '@clack/prompts'
import type { z } from 'zod'
import { envPath } from './config.js'

dotenvConfig({ path: envPath(), quiet: true })

export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
export const DEFAULT_MODEL = 'gpt-4o-mini'

// Models known to return normal content on common OpenAI-compatible routers.
// Tried in order when the configured AI_MODEL produces empty/planning-only output.
export const MODEL_FALLBACKS = [
  'groq/llama-3.3-70b-versatile',   // verified working
  'cf/@cf/meta/llama-3.1-8b-instruct-fp8-fast',
  'gemini/gemini-3-flash-preview',
  'mistral/mistral-small-latest',
  'mimo/mimo-v2-flash',
]

// Fallback models from env (comma-separated) take priority over the hardcoded
// list — lets users point at models their router actually has.
export function getFallbackModels(): string[] {
  const fromEnv = (process.env.AI_FALLBACK_MODELS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return fromEnv.length > 0 ? fromEnv : MODEL_FALLBACKS
}

export class AiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiError'
  }
}

function apiKeyFromSettings(): string {
  return process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY ?? ''
}

export function getSettings() {
  return {
    apiKey: apiKeyFromSettings(),
    baseURL: process.env.AI_BASE_URL ?? DEFAULT_BASE_URL,
    model: process.env.AI_MODEL ?? DEFAULT_MODEL,
  }
}

export function getProvider() {
  const { apiKey, baseURL } = getSettings()
  return createOpenAICompatible({ name: 'tolongssin-ai', baseURL, apiKey })
}

function looksLikeMarkdown(text: string): boolean {
  return /(?:^|\n)\s*#{1,6}\s/m.test(text)        // headings
    || /(?:^|\n)\s*(?:[-*]|\d+\.)\s/m.test(text)  // lists
    || /```/.test(text)                            // code fences
    || /\[[^\]]+\]\([^)]+\)/.test(text)            // links
    || /^#\s/m.test(text)                          // h1
    // Social thread formats (X "1/5", LinkedIn paragraphs, PH sections) are
    // legit output even without classic markdown markers.
    || /(?:^|\n)\s*\d+\/\d+\s/m.test(text)         // "1/5" tweet numbering
    || /(?:^|\n)\s*\[[^\]]+\](?::|\n)/m.test(text) // "[Screenshot: ...]:" labels
    || /(?:^|\n)\s*#{0,3}\s*(?:Tagline|Description|Who is it for\?|Built with)[:\n]/im.test(text) // PH sections
    || /\n\n/.test(text) && text.length > 80        // multi-paragraph prose (LinkedIn)
}

export function sanitizeModelText(raw: string): string {
  let out = raw
    .replace(/<tool_calls>[\s\S]*?<\/tool_calls>/g, ' ')
    .replace(/<invoke[^>]*>[\s\S]*?<\/invoke>/g, ' ')
    .replace(/<result>[\s\S]*?<\/result>/g, ' ')
    .replace(/<use_[\s\S]*?<\/use_[\s\S]*?>/g, ' ')
    .replace(/<\/?[a-z_]+>/gi, ' ')
    .trim()

  out = out
    .replace(/^I(?:'ll| will) (?:check|look|examine|read|find|search|analyze).{0,200}/i, '')
    .replace(/^Let me (?:check|look|examine|read|find|search|analyze|verify|confirm).{0,200}/i, '')
    .replace(/^Now let me (?:check|look|verify|confirm).{0,200}/i, '')
    .replace(/^I have enough to write this.{0,200}/i, '')
    .replace(/^The user (?:is|was) (?:just|only|simply) (?:saying|asking|requesting).{0,200}/i, '')
    .replace(/^(?:Ok|Okay|Alright|Sure),? (?:let me|I(?:'ll| will)).{0,200}/i, '')
    .trim()

  if (out.length < 20 || !looksLikeMarkdown(out) || /^(?:i need to|this is a|writing the)/i.test(out)) {
    // JSON output (from generateJSON flows / structured fallback) is valid even
    // though it is not markdown — never reject it.
    if (!/^[\[{]/.test(out.trim())) return ''
  }
  // Reject leftover planning prose that survived the strip above (e.g. a model
  // that emits "I'll check the repo..." plus a tool-call block that got removed).
  const planningStart =
    /^(?:i'?ll|i will|let me|now let me|ok(?:ay)?[,:]? let me|the user (?:is|was)|i found|here's? (?:what|how) i|i(?:'?ll| will) (?:start|begin|set up|create|write))/i.test(out)
    || /(?:todo plan|set up a (?:todo|plan)|plan for this (?:writing|task)|to ground the post|before (?:writing|drafting))/i.test(out.slice(0, 200))
  if (planningStart) {
    // Planning prose that only contains a bare list ("- Draft tagline") is still
    // planning — require a real markdown structure (heading/code/link) after the
    // planning phrase before accepting the output.
    const rest = out.trim().replace(/^(?:i'?ll|i will|let me|now let me|ok(?:ay)?[,:]? let me|the user (?:is|was)|i found|here's? (?:what|how) i|i(?:'?ll| will) (?:start|begin|set up|create|write))[^\n]*\n?/i, '')
    const hasRealMarkdown =
      /(?:^|\n)\s*#{1,6}\s/m.test(rest)
      || /```/.test(rest)
      || /\[[^\]]+\]\([^)]+\)/.test(rest)
    if (!hasRealMarkdown) return ''
  }
  return out
}

export function textOrReasoning(result: { text?: string; reasoning_content?: unknown; reasoning?: unknown }): string {
  if (typeof result.text === 'string') {
    const cleaned = sanitizeModelText(result.text)
    if (cleaned) return cleaned
  }
  // AI SDK v7 exposes reasoning as `reasoning`; raw fetch responses use `reasoning_content`.
  const reasoning = typeof result.reasoning === 'string' ? result.reasoning : result.reasoning_content
  if (typeof reasoning === 'string') {
    const cleaned = sanitizeModelText(reasoning)
    if (cleaned) return cleaned
  }
  return ''
}

function ensureNonEmpty(text: string, context: string): string {
  if (!text.trim()) {
    throw new AiError(
      `AI returned empty ${context} — the model only outputs internal planning. ` +
      'Try setting AI_MODEL to a non-reasoning model (e.g. gpt-4o-mini) in .tolongssin/.env',
    )
  }
  return text
}

interface ProbeResult {
  ok: boolean
  content: string
}

async function probeModel(apiKey: string, baseURL: string, model: string): Promise<ProbeResult> {
  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
        // Large enough for reasoning models to finish their chain-of-thought
        // and still emit a content token. 8 was too small — reasoning-only
        // routers (gemini-default etc.) consumed it all on thinking.
        max_tokens: 512,
        // Some routers force SSE streaming by default. Explicitly request a
        // single JSON response so `content` is populated (probe can read it).
        stream: false,
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return { ok: false, content: '' }
    const raw = await res.text()

    // Some routers return SSE streaming (data: {...}) even without stream:true.
    // Parse each data chunk and concatenate the delta content/reasoning.
    const sseChunks = raw
      .split('\n')
      .filter((l) => l.startsWith('data:') && !l.includes('[DONE]'))
      .map((l) => l.replace(/^data:\s*/, ''))

    if (sseChunks.length > 0) {
      let content = ''
      let reasoning = ''
      for (const chunk of sseChunks) {
        try {
          const c = JSON.parse(chunk)
          const delta = (c.choices?.[0]?.delta ?? {}) as Record<string, unknown>
          if (typeof delta.content === 'string') content += delta.content
          if (typeof delta.reasoning_content === 'string') reasoning += delta.reasoning_content
        } catch {
          // skip malformed chunk
        }
      }
      const combined = (content + reasoning).trim()
      return { ok: combined.length > 0, content: combined }
    }

    // Non-streaming JSON response.
    let json: Record<string, unknown>
    try {
      json = JSON.parse(raw.replace(/\n?data: \[DONE\]\s*$/, '').trim())
    } catch {
      return { ok: false, content: '' } // non-JSON response (proxy error page, etc.)
    }
    const choices = (json.choices ?? []) as Array<Record<string, unknown>>
    const message = (choices[0]?.message ?? {}) as Record<string, unknown>
    const content = typeof message.content === 'string' ? message.content : ''
    // Reasoning models (deepseek-reasoner etc.) return empty `content` but a
    // non-empty `reasoning_content` — that still proves the model works.
    const reasoning = typeof message.reasoning_content === 'string' ? message.reasoning_content : ''
    const trimmed = (content + reasoning).trim()
    return { ok: trimmed.length > 0, content: trimmed }
  } catch {
    return { ok: false, content: '' }
  }
}

export async function resolveWorkingModel(apiKey: string, baseURL: string): Promise<string | null> {
  for (const model of getFallbackModels()) {
    const { ok } = await probeModel(apiKey, baseURL, model)
    if (ok) return model
  }
  return null
}

export async function rawGenerateTextWith(prompt: string, model: string): Promise<string> {
  const { apiKey, baseURL } = getSettings()
  const url = `${baseURL}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      // Explicitly request a single JSON response (some routers force SSE by
      // default, which would break JSON.parse below).
      stream: false,
      // Reasoning models need headroom past chain-of-thought to emit content.
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    const body = await res.text()
    if (res.status === 401) throw new AiError('AI request failed: check your API key in .tolongssin/.env (401)')
    throw new AiError(`AI request failed: ${res.status} ${body.slice(0, 200)}`)
  }
  const raw = await res.text()

  // Handle routers that ignore `stream:false` and return SSE chunks anyway.
  const sseChunks = raw
    .split('\n')
    .filter((l) => l.startsWith('data:') && !l.includes('[DONE]'))
    .map((l) => l.replace(/^data:\s*/, ''))
  if (sseChunks.length > 0) {
    let content = ''
    let reasoning = ''
    for (const chunk of sseChunks) {
      try {
        const c = JSON.parse(chunk)
        const delta = (c.choices?.[0]?.delta ?? {}) as Record<string, unknown>
        if (typeof delta.content === 'string') content += delta.content
        if (typeof delta.reasoning_content === 'string') reasoning += delta.reasoning_content
      } catch {
        // skip malformed chunk
      }
    }
    const combined = (content + reasoning).trim()
    if (combined) return combined
    throw new AiError(
      'AI returned empty content — the model only outputs internal planning. ' +
      'Try setting AI_MODEL to a non-reasoning model (e.g. gpt-4o-mini) in .tolongssin/.env',
    )
  }

  const json = JSON.parse(raw.replace(/\n?data: \[DONE\]\s*$/, '').trim())
  const choice = json.choices?.[0]
  const content = typeof choice?.message?.content === 'string' ? choice.message.content : ''
  const reasoning = typeof choice?.message?.reasoning_content === 'string' ? choice.message.reasoning_content : ''
  const cleanedContent = sanitizeModelText(content)
  if (cleanedContent) return cleanedContent
  const cleanedReasoning = sanitizeModelText(reasoning)
  if (cleanedReasoning) return cleanedReasoning
  throw new AiError(
    'AI returned empty content — the model only outputs internal planning. ' +
    'Try setting AI_MODEL to a non-reasoning model (e.g. gpt-4o-mini) in .tolongssin/.env',
  )
}

async function rawGenerateText(prompt: string): Promise<string> {
  return rawGenerateTextWith(prompt, getSettings().model)
}

async function safe<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof AiError) throw err
    const message = err instanceof Error ? err.message : String(err)
    const cleaned = message.replace(apiKeyFromSettings(), '[REDACTED]')
    if (/401|unauthorized/i.test(cleaned)) throw new AiError('AI request failed: check your API key in .tolongssin/.env (401)')
    if (/timeout|timed out|ETIMEDOUT|ECONNRESET/i.test(cleaned)) throw new AiError('AI request timed out — retry or switch model')
    throw new AiError(`AI request failed: ${cleaned}`)
  }
}

const FALLBACK_ERROR =
  'AI returned empty content and no fallback model worked on this provider. ' +
  'Set AI_MODEL to a model that returns normal text (e.g. groq/llama-3.3-70b-versatile on this router).'

export async function generateMarkdown(prompt: string): Promise<string> {
  const { apiKey, baseURL, model } = getSettings()
  if (!apiKey) throw new AiError('Missing API key — add OPENAI_API_KEY or AI_API_KEY to .tolongssin/.env')
  return safe(async () => {
    const s = spinner()
    s.start('Generating content...')
    try {
      const result = await generateText({ model: getProvider().languageModel(model), prompt })
      const cleaned = textOrReasoning(result)
      if (cleaned) {
        s.stop('Content generated.')
        return cleaned
      }
      s.stop('Configured model returned empty content; probing fallbacks...')
      const fallback = await resolveWorkingModel(apiKey, baseURL)
      if (!fallback) throw new AiError(FALLBACK_ERROR)
      s.start(`Retrying with fallback model: ${fallback}`)
      try {
        const retryResult = await generateText({ model: getProvider().languageModel(fallback), prompt })
        const content = textOrReasoning(retryResult)
        if (content) {
          s.stop('Content generated.')
          return content
        }
        // Fallback model also returned empty content (reasoning-only output).
        // Try raw text — it sends stream:false + max_tokens headroom, so
        // reasoning models get a chance to finish thinking and emit content.
        return await rawGenerateTextWith(prompt, fallback)
      } catch (err2) {
        const msg2 = err2 instanceof Error ? err2.message : String(err2)
        // Any failure with the fallback model — try raw text as last resort.
        if (/Invalid JSON|empty content|internal planning/i.test(msg2)) return await rawGenerateTextWith(prompt, fallback)
        throw err2
      } finally {
        s.stop('Content generated.')
      }
    } catch (err) {
      s.stop('Generation failed.')
      const msg = err instanceof Error ? err.message : String(err)
      if (/Invalid JSON/i.test(msg)) {
        // Structured output failed even with the fallback — last resort:
        // raw text with the (possibly fallback-resolved) working model.
        const fallback = await resolveWorkingModel(apiKey, baseURL)
        if (fallback) return await rawGenerateTextWith(prompt, fallback)
      }
      throw err
    }
  })
}

export async function generateJSON<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
  const { apiKey, baseURL, model } = getSettings()
  if (!apiKey) throw new AiError('Missing API key — add OPENAI_API_KEY or AI_API_KEY to .tolongssin/.env')
  return safe(async () => {
    const s = spinner()
    s.start('Generating plan...')

    // Try the configured model first (structured output via generateObject).
    try {
      const result = await generateObject({ model: getProvider().languageModel(model), schema, prompt })
      if (result.object !== undefined && result.object !== null) {
        s.stop('Plan generated.')
        return result.object
      }
    } catch {
      // fall through to fallback handling — do NOT loop on the same model
    }

    // Configured model returned nothing usable (reasoning-only output, no
    // structured support, etc.) — resolve a working fallback and try it.
    s.message('Configured model returned no plan; probing fallbacks...')
    const fallback = await resolveWorkingModel(apiKey, baseURL)
    if (!fallback) {
      s.stop('Plan generation failed.')
      throw new AiError(
        'AI returned empty plan and no fallback model worked — set AI_MODEL to a working model ' +
        'or add AI_FALLBACK_MODELS (comma-separated) pointing at models your router actually has.',
      )
    }

    // Attempt 1: structured output with the fallback model.
    try {
      const retry = await generateObject({ model: getProvider().languageModel(fallback), schema, prompt })
      if (retry.object !== undefined && retry.object !== null) {
        s.stop('Plan generated.')
        return retry.object
      }
    } catch {
      // fall through to raw attempt
    }

    // Attempt 2: raw text (reads reasoning_content too) with strict JSON instruction.
    s.message(`Retrying with fallback model: ${fallback}`)
    try {
      const raw = await rawGenerateTextWith(prompt + '\n\nRespond with valid JSON only. No markdown, no explanation.', fallback)
      const parsed = schema.parse(JSON.parse(raw))
      s.stop('Plan generated.')
      return parsed
    } catch {
      s.stop('Plan generation failed.')
      throw new AiError(
        `Fallback model "${fallback}" also failed to produce valid JSON. ` +
        'Try AI_MODEL that supports JSON output, or add AI_FALLBACK_MODELS with a compatible model.',
      )
    }
  })
}
