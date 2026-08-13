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
    return ''
  }
  return out
}

export function textOrReasoning(result: { text?: string; reasoning_content?: unknown }): string {
  if (typeof result.text === 'string') {
    const cleaned = sanitizeModelText(result.text)
    if (cleaned) return cleaned
  }
  if (typeof result.reasoning_content === 'string') {
    const cleaned = sanitizeModelText(result.reasoning_content)
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
        messages: [{ role: 'user', content: 'Say "OK".' }],
        max_tokens: 8,
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return { ok: false, content: '' }
    const raw = await res.text()
    const json = JSON.parse(raw.replace(/\n?data: \[DONE\]\s*$/, '').trim())
    const content = typeof json.choices?.[0]?.message?.content === 'string' ? json.choices[0].message.content : ''
    const trimmed = content.trim()
    return { ok: trimmed.length > 0, content: trimmed }
  } catch {
    return { ok: false, content: '' }
  }
}

export async function resolveWorkingModel(apiKey: string, baseURL: string): Promise<string | null> {
  for (const model of MODEL_FALLBACKS) {
    const { ok } = await probeModel(apiKey, baseURL, model)
    if (ok) return model
  }
  return null
}

async function rawGenerateTextWith(prompt: string, model: string): Promise<string> {
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
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    const body = await res.text()
    if (res.status === 401) throw new AiError('AI request failed: check your API key in .tolongssin/.env (401)')
    throw new AiError(`AI request failed: ${res.status} ${body.slice(0, 200)}`)
  }
  const raw = await res.text()
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
        return ensureNonEmpty(textOrReasoning(retryResult), 'content')
      } catch (err2) {
        const msg2 = err2 instanceof Error ? err2.message : String(err2)
        if (/Invalid JSON/i.test(msg2)) return await rawGenerateTextWith(prompt, fallback)
        throw err2
      } finally {
        s.stop('Content generated.')
      }
    } catch (err) {
      s.stop('Generation failed.')
      const msg = err instanceof Error ? err.message : String(err)
      if (/Invalid JSON/i.test(msg)) return await rawGenerateText(prompt)
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
    try {
      const result = await generateObject({ model: getProvider().languageModel(model), schema, prompt })
      if (result.object === undefined || result.object === null) {
        const fallback = await resolveWorkingModel(apiKey, baseURL)
        if (!fallback) {
          throw new AiError(
            'AI returned empty plan and no fallback model worked — set AI_MODEL to a working model.',
          )
        }
        s.message(`Retrying with fallback model: ${fallback}`)
        const retry = await generateObject({ model: getProvider().languageModel(fallback), schema, prompt })
        s.stop('Plan generated.')
        return retry.object
      }
      s.stop('Plan generated.')
      return result.object
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/Invalid JSON/i.test(msg)) {
        const fallback = await resolveWorkingModel(apiKey, baseURL)
        if (fallback) {
          try {
            const raw = await rawGenerateTextWith(prompt + '\n\nRespond with valid JSON only. No markdown, no explanation.', fallback)
            return schema.parse(JSON.parse(raw))
          } catch {
            // fall through to the configured-model raw attempt below
          }
        }
        const raw = await rawGenerateText(prompt + '\n\nRespond with valid JSON only. No markdown, no explanation.')
        return schema.parse(JSON.parse(raw))
      }
      throw err
    }
  })
}
