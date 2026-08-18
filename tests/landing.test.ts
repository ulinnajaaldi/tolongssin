import { describe, expect, it } from 'vitest'
import { buildLandingPrompt, MACROSTRUCTURES, normalizeAccent, renderLandingPage, slopTest, SectionPlanSchema } from '../src/lib/landing-generator.js'
import type { SectionPlan } from '../src/lib/landing-generator.js'

const samplePlan: SectionPlan = {
  macrostructure: 'editorial',
  sections: [{ id: 'x', heading: 'H', body: 'B' }],
  accentHue: '#E15554',
  displayFont: 'Merriweather',
  bodyFont: 'Source Sans 3',
}

describe('MACROSTRUCTURES', () => {
  it('has 6 options', () => {
    expect(MACROSTRUCTURES).toHaveLength(6)
  })
})

describe('buildLandingPrompt', () => {
  it('includes value proposition', () => {
    const prompt = buildLandingPrompt({
      projectName: 'Demo',
      valueProp: 'Saves time',
      audience: 'Devs',
      recentMacrostructures: [],
    })
    expect(prompt).toContain('Value proposition: Saves time')
  })

  it('excludes recent macrostructures', () => {
    const prompt = buildLandingPrompt({
      projectName: 'Demo',
      valueProp: 'Fast',
      audience: 'Devs',
      recentMacrostructures: ['split-hero'],
    })
    expect(prompt).toContain('Do NOT use any of these recently used macrostructures: split-hero')
  })

  it('includes study signals when provided', () => {
    const prompt = buildLandingPrompt({
      projectName: 'Demo',
      valueProp: 'Fast',
      audience: 'Devs',
      recentMacrostructures: [],
      studySignals: 'Page title: Acme',
    })
    expect(prompt).toContain('Design direction')
    expect(prompt).toContain('Page title: Acme')
  })
})

describe('SectionPlanSchema', () => {
  it('validates a correct plan', () => {
    expect(() => SectionPlanSchema.parse(samplePlan)).not.toThrow()
  })

  it('rejects missing macrostructure', () => {
    expect(() => SectionPlanSchema.parse({ ...samplePlan, macrostructure: 'invalid' })).toThrow()
  })
})

describe('renderLandingPage', () => {
  it('produces valid HTML with required elements', () => {
    const html = renderLandingPage({ plan: samplePlan, projectName: 'Demo' })
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<h1')
    expect(html).toContain('<meta name="viewport"')
    expect(html).toContain('#E15554')
  })
})

describe('normalizeAccent', () => {
  it('passes through hex colors', () => {
    expect(normalizeAccent('#E15554')).toBe('#E15554')
    expect(normalizeAccent('#e15554')).toBe('#e15554')
  })

  it('converts bare hue numbers to hsl', () => {
    expect(normalizeAccent('24')).toBe('hsl(24 70% 45%)')
    expect(normalizeAccent('200')).toBe('hsl(200 70% 45%)')
  })

  it('passes through hsl/rgb', () => {
    expect(normalizeAccent('hsl(24 70% 45%)')).toBe('hsl(24 70% 45%)')
  })

  it('falls back to safe color for garbage', () => {
    expect(normalizeAccent('bogus')).toBe('#E15554')
  })
})

describe('slopTest', () => {
  it('catches Inter for both fonts', () => {
    const html = '<html><style>:root{--display-font: Inter; --body-font: Inter; font-family: Inter;}</style><body>hi</body></html>'
    const violations = slopTest(html)
    expect(violations).toContainEqual(expect.stringContaining('Inter'))
  })

  it('catches purple gradient', () => {
    const html = '<div style="background: linear-gradient(purple, pink)"></div>'
    expect(slopTest(html)).toHaveLength(1)
  })

  it('passes clean HTML', () => {
    expect(slopTest('<html><body>clean</body></html>')).toHaveLength(0)
  })

  it('catches emoji overload', () => {
    const html = '<p>' + '\uD83C\uDF89'.repeat(20) + '</p>'
    expect(slopTest(html)).toHaveLength(1)
  })

  it('catches default/system fonts (Roboto, Poppins, etc.)', () => {
    const html = '<div style="font-family: Roboto, sans-serif">hi</div>'
    const v = slopTest(html)
    expect(v).toContainEqual(expect.stringContaining('Default/system font'))
  })

  it('catches gradient text (background-clip: text)', () => {
    const html = '<h1 style="background: linear-gradient(90deg, #f00, #00f); -webkit-background-clip: text; background-clip: text; color: transparent">Gradient</h1>'
    const v = slopTest(html)
    expect(v).toContainEqual(expect.stringContaining('Gradient text'))
  })

  it('catches fake browser chrome (traffic-light dots)', () => {
    const html = '<div class="browser-bar"><span style="background:#ff5f56"></span><span style="background:#ffbd2e"></span><span style="background:#27c93f"></span></div>'
    const v = slopTest(html)
    expect(v).toContainEqual(expect.stringContaining('Fake browser chrome'))
  })

  it('catches invented metrics / trusted-by claims', () => {
    const html = '<p>Trusted by 50,000+ teams. +47% conversion.</p>'
    const v = slopTest(html)
    expect(v).toContainEqual(expect.stringContaining('Invented metric'))
  })

  it('catches glassmorphism (backdrop blur)', () => {
    const html = '<div style="backdrop-filter: blur(8px); background: rgba(255,255,255,0.8)">glass</div>'
    const v = slopTest(html)
    expect(v).toContainEqual(expect.stringContaining('Glassmorphism'))
  })
})

describe('Hallmark rules in prompt', () => {
  it('includes Hallmark anti-slop rules', () => {
    const prompt = buildLandingPrompt({ projectName: 'X', valueProp: 'Y', audience: 'Z', recentMacrostructures: [] })
    expect(prompt).toContain('anti-AI-slop')
    expect(prompt).toContain('centered-everything hero')
    expect(prompt).toContain('three-equal-column')
    expect(prompt).toContain('italic headers')
    expect(prompt).toContain('fake browser/phone/IDE chrome')
    expect(prompt).toContain('Pre-emit self-critique')
  })
})
