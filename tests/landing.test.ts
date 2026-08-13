import { describe, expect, it } from 'vitest'
import { buildLandingPrompt, MACROSTRUCTURES, renderLandingPage, slopTest, SectionPlanSchema } from '../src/lib/landing-generator.js'
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
})
