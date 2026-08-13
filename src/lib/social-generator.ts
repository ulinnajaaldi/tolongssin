import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateMarkdown } from './ai.js'
import type { RepoInfo } from './analyzer.js'
import type { TolongssinConfig } from './config.js'

export interface SocialOptions {
  dryRun?: boolean
}

export interface SocialPromptInput {
  projectName: string
  valueProp: string
  audience: string
  primaryCta?: string
  repoInfo: Pick<RepoInfo, 'name' | 'description' | 'keywords' | 'repoType' | 'dependencies' | 'fileStructure'>
}

export function buildXPrompt(input: SocialPromptInput): string {
  return `Write an X/Twitter thread (5–7 tweets) announcing "${input.projectName}".
Value proposition: ${input.valueProp}
Target audience: ${input.audience}
Repo type: ${input.repoInfo.repoType}
${input.repoInfo.dependencies?.length ? `Tech stack: ${input.repoInfo.dependencies.join(', ')}` : ''}
${input.primaryCta ? `Primary CTA: ${input.primaryCta}` : ''}

Format: hook tweet → 3–5 body tweets → CTA tweet.
Each tweet must be ≤ 280 characters.
Tone: dev-friendly, witty, self-deprecating humor welcome. No corporate speak.
Include a suggestion for a screenshot hook (which screenshot to lead with).
NEVER invent metrics, user counts, or testimonials — use placeholders like "[X users]" if needed.
Never include secrets or API keys.`
}

export function buildLinkedInPrompt(input: SocialPromptInput): string {
  return `Write a LinkedIn post about "${input.projectName}".
Value proposition: ${input.valueProp}
Target audience: ${input.audience}
Repo type: ${input.repoInfo.repoType}
${input.repoInfo.dependencies?.length ? `Tech stack: ${input.repoInfo.dependencies.join(', ')}` : ''}
${input.primaryCta ? `Primary CTA: ${input.primaryCta}` : ''}

Format: story-framed — "how we built this" angle. Problem → journey → result.
1–2 paragraphs max, 100–150 words.
Soft CTA at the end (no hard sell).
Include ≤ 3 relevant hashtags.
Tone: authentic, technical, no buzzwords.
NEVER invent metrics, user counts, or testimonials — use placeholders like "[X users]" if needed.
Never include secrets or API keys.`
}

export function buildProductHuntPrompt(input: SocialPromptInput): string {
  return `Write a Product Hunt listing for "${input.projectName}".
Value proposition: ${input.valueProp}
Target audience: ${input.audience}
Repo type: ${input.repoInfo.repoType}
${input.repoInfo.dependencies?.length ? `Tech stack: ${input.repoInfo.dependencies.join(', ')}` : ''}
${input.primaryCta ? `Primary CTA: ${input.primaryCta}` : ''}

Include:
- Tagline (≤60 chars, punchy)
- Description (2–3 sentences, benefit-driven)
- Who is it for? (1 sentence)
- 3 key features (bullet points, benefit-led)
- "Built with" section mentioning the tech stack
- Ask for feedback at the end

Tone: benefit-first, clear, no fluff.
NEVER invent metrics, user counts, or testimonials — use placeholders like "[X users]" if needed.
Never include secrets or API keys.`
}

export interface SocialDraft {
  platform: string
  filename: string
  content: string
}

export async function generateSocialDrafts(
  cfg: TolongssinConfig,
  repoInfo: Pick<RepoInfo, 'name' | 'description' | 'keywords' | 'repoType' | 'dependencies' | 'fileStructure'>,
  opts: Readonly<{ dryRun?: boolean }> = {},
  cwd = process.cwd(),
): Promise<SocialDraft[]> {
  const input: SocialPromptInput = {
    projectName: cfg.projectName,
    valueProp: cfg.valueProp,
    audience: cfg.audience,
    primaryCta: cfg.primaryCta,
    repoInfo,
  }

  const prompts: Array<{ platform: string; filename: string; prompt: string }> = [
    { platform: 'X', filename: 'x.md', prompt: buildXPrompt(input) },
    { platform: 'LinkedIn', filename: 'linkedin.md', prompt: buildLinkedInPrompt(input) },
    { platform: 'Product Hunt', filename: 'producthunt.md', prompt: buildProductHuntPrompt(input) },
  ]

  const drafts: SocialDraft[] = []
  for (const p of prompts) {
    const content = await generateMarkdown(p.prompt)
    drafts.push({ platform: p.platform, filename: p.filename, content })
  }

  if (opts.dryRun) {
    for (const d of drafts) {
      console.log(`\n--- ${d.platform} (${d.filename}) ---`)
      console.log(d.content)
    }
    return drafts
  }

  const socialDir = join(cwd, 'marketing-kit', 'social')
  mkdirSync(socialDir, { recursive: true })
  for (const d of drafts) {
    writeFileSync(join(socialDir, d.filename), d.content, 'utf8')
  }

  console.log(`Generated ${drafts.length} drafts in marketing-kit/social/: ${drafts.map(d => d.filename).join(', ')}`)
  return drafts
}
