import { z } from 'zod'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateJSON } from './ai.js'
import type { RepoInfo } from './analyzer.js'
import type { TolongssinConfig } from './config.js'

export const MACROSTRUCTURES = ['split-hero', 'centered-hero', 'editorial', 'terminal', 'product-shot', 'minimal'] as const

export const SectionPlanSchema = z.object({
  macrostructure: z.enum(MACROSTRUCTURES),
  sections: z.array(z.object({ id: z.string(), heading: z.string(), body: z.string(), cta: z.string().optional() })),
  accentHue: z.string().describe('Single accent color as CSS hex, e.g. #E15554 — one color used sparingly, no gradients'),
  displayFont: z.string().describe('Google Font name for headings, never Inter'),
  bodyFont: z.string().describe('Google Font name for body text, distinct from displayFont'),
})

export type SectionPlan = z.infer<typeof SectionPlanSchema>

export interface LandingPromptInput {
  projectName: string
  valueProp: string
  audience: string
  primaryCta?: string
  recentMacrostructures: string[]
  studySignals?: string
  repoContext?: string
}

export function buildLandingPrompt(input: LandingPromptInput): string {
  const historyNote = input.recentMacrostructures.length > 0
    ? `\nDo NOT use any of these recently used macrostructures: ${input.recentMacrostructures.join(', ')}.`
    : ''
  const studyNote = input.studySignals
    ? `\n\nDesign direction from the studied URL (structure only, do not copy pixels):\n${input.studySignals}`
    : ''
  const repoNote = input.repoContext ? `\n\nProject context:\n${input.repoContext}` : ''
  return `You are designing a single landing page for "${input.projectName}".
Value proposition: ${input.valueProp}
Target audience: ${input.audience}
${input.primaryCta ? `Primary CTA: ${input.primaryCta}` : ''}${historyNote}${studyNote}${repoNote}

Generate a SectionPlan — pick from these macrostructures:
${MACROSTRUCTURES.join(', ')}

Rules (Hallmark anti-AI-slop DNA):
- Pick a distinctive macrostructure that fits the project type.
- Pick a distinctive display + body font pair — NEVER Inter for both.
- Choose ONE accent hue (a single color, used sparingly; no purple-to-pink gradients).
- Solid surfaces (subtle borders or flat fills, no glassmorphism).
- Sections: each has a short human heading, a 1-2 sentence body (no corporate filler), and an optional CTA.
- Do NOT invent metrics, testimonials, or fake quotes.
- Short, punchy copy. No "unlock the power of" or "revolutionize".`
}

export async function fetchStudySignals(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    const html = await res.text()
    const signals: string[] = []
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) signals.push(`Page title: ${titleMatch[1].trim()}`)
    const fontMatches = html.matchAll(/fonts\.googleapis\.com\/css\?family=([^&"']+)/gi)
    for (const m of fontMatches) signals.push(`Fonts used: ${decodeURIComponent(m[1])}`)
    if (/[class*="hero" class*="banner"]/.test(html)) signals.push('Layout hint: has hero/banner section')
    if (/grid|two-col|split/i.test(html)) signals.push('Layout hint: grid or split layout detected')
    return signals.length > 0 ? signals.join('\n') : null
  } catch {
    return null
  }
}

export function slopTest(html: string): string[] {
  const violations: string[] = []
  if (/Inter/gi.test(html) && (html.match(/font-family/gi)?.length ?? 0) > 0) {
    const displayMatch = html.match(/--display-font:([^;]+)/i)?.[1]
    const bodyMatch = html.match(/--body-font:([^;]+)/i)?.[1]
    if (displayMatch && bodyMatch && /Inter/i.test(displayMatch) && /Inter/i.test(bodyMatch)) {
      violations.push('Inter used for both display and body font')
    }
  }
  if (/linear-gradient\([^)]*(?:purple|#8b5cf6|#a855f7|#ec4899|#d946ef|#f472b6)/i.test(html)) {
    violations.push('Purple-to-pink gradient detected')
  }
  const emojiCount = (html.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) ?? []).length
  if (emojiCount > 10) violations.push('Emoji overload detected')
  return violations
}

export interface LandingRenderInput {
  plan: SectionPlan
  projectName: string
  primaryCta?: string
}

export function renderLandingPage(input: LandingRenderInput): string {
  const { plan, projectName, primaryCta } = input
  const cta = primaryCta ?? 'Get started'
  const sections = plan.sections.map(s => `
      <section style="padding: 4rem 2rem; max-width: 800px; margin: 0 auto;">
        <h2 style="font-family: var(--display-font); font-size: 1.75rem; margin-bottom: 1rem;">${escHtml(s.heading)}</h2>
        <p style="font-family: var(--body-font); font-size: 1.1rem; line-height: 1.6; color: #374151;">${escHtml(s.body)}</p>
        ${s.cta ? `<a href="#" style="display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: var(--accent); color: white; border-radius: 6px; text-decoration: none; font-family: var(--body-font);">${escHtml(s.cta)}</a>` : ''}
      </section>`).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(projectName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(plan.displayFont)}:wght@700&family=${encodeURIComponent(plan.bodyFont)}:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --accent: ${plan.accentHue};
      --display-font: '${plan.displayFont}', sans-serif;
      --body-font: '${plan.bodyFont}', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--body-font); color: #111827; }
  </style>
</head>
<body>
  <header style="padding: 3rem 2rem; text-align: ${plan.macrostructure === 'centered-hero' ? 'center' : 'left'}; max-width: 800px; margin: 0 auto;">
    <h1 style="font-family: var(--display-font); font-size: 2.5rem; margin-bottom: 0.75rem;">${escHtml(projectName)}</h1>
    <p style="font-family: var(--body-font); font-size: 1.2rem; color: #374151; max-width: 600px;">${escHtml(input.plan.sections[0]?.body ?? '')}</p>
    ${cta ? `<a href="#" style="display: inline-block; margin-top: 1.5rem; padding: 0.875rem 2rem; background: var(--accent); color: white; border-radius: 6px; text-decoration: none; font-family: var(--body-font); font-weight: 600;">${escHtml(cta)}</a>` : ''}
  </header>
  ${sections}
  <footer style="padding: 2rem; text-align: center; color: #9ca3af; font-size: 0.875rem; font-family: var(--body-font);">
    Generated with <a href="https://github.com/ulinnaja/tolongssin" style="color: var(--accent);">TOLONGSSIN</a>
  </footer>
</body>
</html>`
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export interface LandingOptions {
  dryRun?: boolean
  study?: string
}

export async function generateLanding(
  cfg: TolongssinConfig,
  opts: Readonly<{ dryRun?: boolean; study?: string }> = {},
  cwd = process.cwd(),
  repoInfo?: RepoInfo,
): Promise<void> {
  const recentHistory = cfg.landingPage?.macrostructureHistory ?? []

  let studySignals: string | undefined
  if (opts.study) {
    const fetched = await fetchStudySignals(opts.study)
    studySignals = fetched ?? undefined
    if (!fetched) console.warn(`Could not fetch ${opts.study} — proceeding without study signals.`)
  }

  const repoContext = repoInfo
    ? [
        repoInfo.dependencies?.length ? `Dependencies: ${repoInfo.dependencies.join(', ')}` : null,
        repoInfo.fileStructure?.length ? `Top-level structure: ${repoInfo.fileStructure.join(', ')}` : null,
      ].filter(Boolean).join('\n')
    : undefined

  const prompt = buildLandingPrompt({
    projectName: cfg.projectName,
    valueProp: cfg.valueProp,
    audience: cfg.audience,
    primaryCta: cfg.primaryCta,
    recentMacrostructures: recentHistory,
    studySignals,
    repoContext,
  })

  const plan = await generateJSON(prompt, SectionPlanSchema)

  let html = renderLandingPage({ plan, projectName: cfg.projectName, primaryCta: cfg.primaryCta })
  let violations = slopTest(html)
  if (violations.length > 0) {
    const feedback = `\n\nPrevious plan violated: ${violations.join('; ')}. Choose different fonts, accent, or layout.`
    const retryPlan = await generateJSON(prompt + feedback, SectionPlanSchema)
    html = renderLandingPage({ plan: retryPlan, projectName: cfg.projectName, primaryCta: cfg.primaryCta })
    violations = slopTest(html)
  }

  if (opts.dryRun) {
    console.log('--- landing plan (dry-run) ---')
    console.log(JSON.stringify(violations.length > 0 ? { ...plan, slopViolations: violations } : plan, null, 2))
    return
  }

  const updatedHistory = [...recentHistory, plan.macrostructure].slice(-3)
  cfg.landingPage = { ...cfg.landingPage, macrostructure: plan.macrostructure, macrostructureHistory: updatedHistory }

  const landingDir = join(cwd, 'marketing-kit', 'landing')
  mkdirSync(landingDir, { recursive: true })
  writeFileSync(join(landingDir, violations.length > 0 ? 'draft.html' : 'index.html'), html, 'utf8')
  writeFileSync(join(landingDir, 'README.md'), `# Landing page\n\nGenerated by tolongssin.\n\nDeploy to Vercel/Netlify by dragging the \`index.html\` file.\n`, 'utf8')

  const configPath = join(cwd, '.tolongssin', 'config.json')
  if (existsSync(configPath)) {
    const existing: TolongssinConfig = JSON.parse(readFileSync(configPath, 'utf8'))
    existing.landingPage = { ...existing.landingPage, ...cfg.landingPage }
    writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n', 'utf8')
  }

  console.log(violations.length > 0
    ? 'Slop-test violations detected — written to marketing-kit/landing/draft.html (user reviews before deploying).'
    : 'Landing page written to marketing-kit/landing/index.html — deploy to Vercel/Netlify.')
}
